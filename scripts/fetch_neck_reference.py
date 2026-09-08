"""Fetch only named reference structures from the official BodyParts3D ZIP.
Usage: python3 fetch_neck_reference.py OUTPUT_DIRECTORY [--support | --occipital]
--support selects same-atlas skin and bones for registration diagnostics.
--occipital selects the occipital bone for posterior head landmark review.
Uses HTTP ranges, validates ZIP CRC, and preserves source metadata.
"""
import io
import json
import hashlib
from pathlib import Path
import sys
import urllib.request
import zipfile

BASE = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'
URL = BASE + 'isa_BP3D_4.0_obj_99.zip'


class RemoteZip(io.RawIOBase):
    def __init__(self):
        response = urllib.request.urlopen(urllib.request.Request(URL, headers={'Range': 'bytes=0-0'}), timeout=30)
        if response.status != 206:
            raise ValueError('Server must support range requests')
        self.size = int(response.headers['Content-Range'].split('/')[-1])
        self.etag = response.headers['ETag']
        response.close()
        self.position = 0

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        self.position = offset + (self.position if whence == 1 else self.size if whence == 2 else 0)
        if self.position < 0:
            raise ValueError('Negative offset')
        return self.position

    def read(self, size=-1):
        end = self.size if size < 0 else min(self.size, self.position+size)
        if end <= self.position:
            return b''
        request = urllib.request.Request(URL, headers={
            'Range': f'bytes={self.position}-{end-1}', 'If-Match': self.etag})
        with urllib.request.urlopen(request, timeout=60) as response:
            expected = f'bytes {self.position}-{end-1}/{self.size}'
            if response.status != 206 or response.headers.get('Content-Range') != expected:
                raise ValueError('Unexpected range response')
            data = response.read()
        if len(data) != end-self.position:
            raise ValueError('Truncated range')
        self.position = end
        return data


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv) > 3 or (len(sys.argv) == 3 and sys.argv[2] not in ['--support', '--occipital']):
        raise SystemExit('Usage: fetch_neck_reference.py OUTPUT_DIRECTORY [--support | --occipital]')
    output = Path(sys.argv[1]); output.mkdir(parents=True, exist_ok=True)
    names = {'BP4909': 'right sternocleidomastoid', 'BP4910': 'left sternocleidomastoid',
             'BP7901': 'thyroid cartilage', 'BP9117': 'cricoid cartilage'}
    if '--support' in sys.argv[2:]:
        names = {'BP9115': 'skin', 'BP8562': 'manubrium', 'BP9271': 'right clavicle',
                 'BP8841': 'left clavicle', 'BP8107': 'mandible', 'BP8836': 'hyoid bone'}
    elif '--occipital' in sys.argv[2:]:
        names = {'BP9177': 'occipital bone'}
    for filename, url in [('isa_parts_list_e.txt', BASE+'isa_parts_list_e.txt'),
                          ('isa_element_parts.txt', BASE+'isa_element_parts.txt'),
                          ('license.html', 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html')]:
        with urllib.request.urlopen(url, timeout=30) as response:
            (output/filename).write_bytes(response.read())
    table = (output/'isa_parts_list_e.txt').read_text()
    rows = {}
    for line in table.splitlines()[1:]:
        values = line.split('\t')
        if len(values) == 3 and values[1] in names:
            assert names[values[1]] == values[2]
            rows[values[1]] = values
    assert set(rows) == set(names)
    elements = {}
    for line in (output/'isa_element_parts.txt').read_text().splitlines()[1:]:
        values = line.split('\t')
        if len(values) == 3:
            elements.setdefault(values[0], []).append(values[2])
    remote = RemoteZip()
    records = []
    with zipfile.ZipFile(remote) as archive:
        for part, label in names.items():
            for element in elements[rows[part][0]]:
                entries = [i for i in archive.infolist() if Path(i.filename).name == element+'.obj']
                if len(entries) != 1:
                    raise ValueError(f'Expected one mesh for {element}, got {len(entries)}')
                entry = entries[0]
                raw = archive.read(entry)  # zipfile verifies CRC on complete read.
                (output/(element+'.obj')).write_bytes(raw)
                records.append({'id': part, 'fmaId': rows[part][0], 'name': label,
                                'elementId': element, 'zipPath': entry.filename, 'crc32': f'{entry.CRC:08x}',
                                'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    manifest = {'sourceUrl': URL, 'zipETag': remote.etag, 'zipBytes': remote.size,
                'attribution': 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
                'licenseUrl': 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
                'status': 'Independent reference meshes; not registered to the application human.',
                'structures': records,
                'metadataSha256': {n: hashlib.sha256((output/n).read_bytes()).hexdigest() for n in ['isa_parts_list_e.txt','isa_element_parts.txt','license.html']}}
    (output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(records, ensure_ascii=False))
