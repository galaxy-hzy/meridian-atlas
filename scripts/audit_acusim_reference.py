"""Read-only AcuSim provenance, label and saved-scene audit; never execute source code.

Usage: python3 audit_acusim_reference.py REFERENCE_DIR STANDARD_NAMES.json OUTPUT.json
The small pinned Blender sample is inspected as binary data, without loading Blender
or executing embedded scripts. Saved transforms are not evaluated model coordinates.
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys

COMMIT = 'aa32b7043e22baa89b080b5e15d2834c080c616c'
SCENE = 'script/M_Asher_N_HD/test.blend'


def digest(data):
    return hashlib.sha256(data).hexdigest()


class SavedBlend:
    """Strict reader for this 64-bit little-endian Blender 3.5 snapshot only."""

    def __init__(self, data):
        if data[:12] != b'BLENDER-v305':
            raise ValueError('Unsupported Blender header; no format guessing')
        self.blocks = []
        cursor = 12
        while cursor < len(data):
            code, size, address, dna, count = struct.unpack_from('<4sIQII', data, cursor)
            cursor += 24
            if cursor + size > len(data):
                raise ValueError('Truncated Blender block')
            self.blocks.append((code, address, dna, count, data[cursor:cursor + size]))
            cursor += size
            if code == b'ENDB':
                break
        if cursor != len(data) or self.blocks[-1][0] != b'ENDB':
            raise ValueError('Invalid Blender end marker')
        dna_blocks = [b[4] for b in self.blocks if b[0] == b'DNA1']
        if len(dna_blocks) != 1:
            raise ValueError('Expected one DNA schema')
        dna = dna_blocks[0]
        if dna[:8] != b'SDNANAME':
            raise ValueError('Invalid DNA schema')
        cursor = 8

        def strings(cursor):
            count = struct.unpack_from('<I', dna, cursor)[0]
            cursor += 4
            values = []
            for _ in range(count):
                end = dna.index(b'\0', cursor)
                values.append(dna[cursor:end].decode('ascii'))
                cursor = end + 1
            return values, (cursor + 3) // 4 * 4

        names, cursor = strings(cursor)
        if dna[cursor:cursor + 4] != b'TYPE':
            raise ValueError('Missing DNA TYPE')
        types, cursor = strings(cursor + 4)
        if dna[cursor:cursor + 4] != b'TLEN':
            raise ValueError('Missing DNA TLEN')
        cursor += 4
        lengths = struct.unpack_from('<' + 'H' * len(types), dna, cursor)
        cursor = (cursor + len(types) * 2 + 3) // 4 * 4
        if dna[cursor:cursor + 4] != b'STRC':
            raise ValueError('Missing DNA STRC')
        cursor += 4
        count = struct.unpack_from('<I', dna, cursor)[0]
        cursor += 4
        self.schemas = []
        for _ in range(count):
            type_id, field_count = struct.unpack_from('<HH', dna, cursor)
            cursor += 4
            fields, offset = {}, 0
            for _ in range(field_count):
                field_type, field_name = struct.unpack_from('<HH', dna, cursor)
                cursor += 4
                name = names[field_name]
                multiplicity = math.prod(map(int, re.findall(r'\[(\d+)\]', name)))
                size = (8 if '*' in name else lengths[field_type]) * multiplicity
                fields[name] = (offset, size, types[field_type])
                offset += size
            if offset != lengths[type_id]:
                raise ValueError(f'DNA field size mismatch: {types[type_id]}')
            self.schemas.append((types[type_id], fields))
        if cursor != len(dna):
            raise ValueError('Unparsed DNA bytes')
        self.fields = dict(self.schemas)
        self.by_address = {b[1]: b for b in self.blocks if b[1]}

    def id_name(self, payload):
        offset, size, _ = self.fields['ID']['name[66]']
        return payload[offset:offset + size].split(b'\0', 1)[0].decode('utf-8')

    def objects(self):
        results = []
        for code, _, dna, count, payload in self.blocks:
            if code != b'OB\0\0':
                continue
            kind, fields = self.schemas[dna]
            if kind != 'Object' or count != 1:
                raise ValueError('Unexpected Object layout')

            def values(name, fmt):
                return list(struct.unpack_from('<' + fmt, payload, fields[name][0]))

            name = self.id_name(payload)[2:]
            data_address = values('*data', 'Q')[0]
            data_block = self.by_address.get(data_address)
            data_name = self.id_name(data_block[4]) if data_block else None
            loc = values('loc[3]', '3f')
            matrix = values('obmat[4][4]', '16f')
            if not all(math.isfinite(v) for v in loc + matrix):
                raise ValueError('Nonfinite saved transform')
            results.append({
                'name': name, 'objectType': values('type', 'h')[0],
                'dataName': data_name, 'dataBlockPresent': data_block is not None,
                'localLocation': loc, 'savedWorldMatrix': matrix,
                'savedTranslation': matrix[12:15],
                'hasParent': bool(values('*parent', 'Q')[0]),
                'hasConstraints': bool(values('constraints', 'Q')[0]),
                'hasModifiers': bool(values('modifiers', 'Q')[0]),
                'evaluated': False,
            })
        return results


def label_mapping(label, standards):
    parts = label.split('_')
    code = parts[0]
    # Nomenclature aliases only; never correct suspected transcription errors silently.
    normalized = re.sub(r'^(SJ|RN|DU)(?=\d)',
                        lambda m: {'SJ': 'TE', 'RN': 'CV', 'DU': 'GV'}[m[1]], code)
    name = next((p for p in parts[1:] if re.search(r'[\u3400-\u9fff]', p)), None)
    match = standards.get(normalized)
    candidates = [r['id'] for r in standards.values() if name and r['name'] == name]
    problems = []
    if match is None:
        problems.append('unrecognized-standard-code')
    elif name is None:
        problems.append('name-absent-component-label')
    elif name != match['name']:
        problems.append('code-name-mismatch')
    return {
        'rawLabel': label, 'rawCode': code, 'rawName': name,
        'normalizedCode': normalized, 'standardName': match['name'] if match else None,
        'candidateIdsByExactName': candidates, 'issues': problems,
        'identityMatched': not problems, 'geometryAccepted': False,
        'clause': match.get('clause') if match else None,
        'pdfPage': match.get('pdfPage') if match else None,
    }


def audit(reference, standards_path):
    manifest = json.loads((reference / 'manifest.json').read_text())
    if manifest['commit'] != COMMIT:
        raise ValueError('Reference commit changed; review the new dataset first')
    for entry in manifest['files']:
        path = (reference / entry['path']).resolve()
        if not path.is_relative_to(reference.resolve()):
            raise ValueError('Reference manifest escapes its directory')
        data = path.read_bytes()
        if len(data) != entry['size'] or digest(data) != entry['sha256']:
            raise ValueError(f'Reference checksum mismatch: {entry["path"]}')
        if 'gitBlob' in entry:
            git_hash = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
            if git_hash != entry['gitBlob']:
                raise ValueError('Git blob mismatch')
    standards = {r['id']: r for r in json.loads(standards_path.read_text())}
    samples = {}
    for filename in ['asher.json', 'asher_all.json']:
        labels = json.loads((reference / filename).read_text())['label']
        if any(set(r['coordinate']) != {'x', 'y', 'n', 'h'} for r in labels):
            raise ValueError('Changed coordinate schema')
        mapped = [label_mapping(r['name'], standards) for r in labels]
        samples[filename] = {
            'labelCount': len(labels),
            'uniqueSidedLabels': len({r['name'] for r in labels}),
            'uniqueLabelsIgnoringLeftRight': len({re.sub(r'_(left|right)$', '', r['name']) for r in labels}),
            'uniqueRawCodes': len({r['name'].split('_')[0] for r in labels}),
            'issueCounts': dict(collections.Counter(i for r in mapped for i in r['issues'])),
            'coordinateKeys': ['x', 'y', 'n', 'h'],
            'coordinateSemantics': 'image-plane x/y, camera-relative depth h, orientation n; not model XYZ',
            'mappings': mapped,
        }
    blend = SavedBlend((reference / SCENE).read_bytes())
    objects = blend.objects()
    for item in objects:
        if re.match(r'^(LI|ST|SI|BL|SJ|GB|EX-|RN|DU)\d?', item['name']):
            item['labelMapping'] = label_mapping(item['name'], standards)
    sample_names = {re.sub(r'_(left|right)$', '', r['rawLabel'])
                    for r in samples['asher_all.json']['mappings']}
    object_names = {o['name'] for o in objects if 'labelMapping' in o}
    return {
        'status': 'reference-only-pending-identity-and-anatomical-registration',
        'commit': COMMIT, 'sourceManifestSha256': digest((reference / 'manifest.json').read_bytes()),
        'standardNamesSha256': digest(standards_path.read_bytes()),
        'samples': samples,
        'savedScene': {'file': SCENE, 'blockCount': len(blend.blocks),
                       'schemaCount': len(blend.schemas), 'objectCount': len(objects), 'objects': objects,
                       'labelObjectCount': len(object_names),
                       'labelsMissingFromScene': sorted(sample_names - object_names),
                       'objectsMissingFromSample': sorted(object_names - sample_names),
                       'transformsEvaluated': False,
                       'note': 'Saved binary data only. No Blender evaluation, model transfer or anatomical acceptance.'},
        'expertValidationScope': {'paper': 'https://doi.org/10.1038/s41597-025-04934-9',
                                  'section': 'Quantitative Error Analysis', 'experts': 3,
                                  'points': 13, 'syntheticModels': 10, 'measurement': 'rendered-image pixel deviations'},
        'runtimeImportsAdded': False, 'applicationCoordinatesChanged': False,
    }


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    reference, standards, output = map(Path, sys.argv[1:])
    if output.suffix != '.json' or output.resolve().is_relative_to(reference.resolve()) or output.resolve() == standards.resolve():
        raise SystemExit('Output must be a separate .json outside the read-only reference directory')
    result = audit(reference, standards)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'sceneObjects': result['savedScene']['objectCount'],
                      'allSampleIssues': result['samples']['asher_all.json']['issueCounts']}, ensure_ascii=False))
