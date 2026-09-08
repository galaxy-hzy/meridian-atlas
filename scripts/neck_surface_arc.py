"""Ordered surface sections, used only for local schematic relationships."""
import numpy as np

def half_contour(segments):
    nodes, edges = {}, set()
    key = lambda p: tuple(round(float(x), 8) for x in p)
    for a, b in np.array(segments):
        if a[0] < 0 and b[0] < 0:
            continue
        if a[0] < 0:
            a = a+(b-a)*(-a[0]/(b[0]-a[0]))
        if b[0] < 0:
            b = b+(a-b)*(-b[0]/(a[0]-b[0]))
        ka, kb = key(a), key(b)
        if ka == kb:
            continue
        nodes[ka], nodes[kb] = a, b
        edges.add(tuple(sorted([ka, kb])))
    neighbors = {k: [] for k in nodes}
    for a, b in edges:
        neighbors[a].append(b); neighbors[b].append(a)
    ends = [k for k, v in neighbors.items() if len(v) == 1]
    if len(ends) != 2 or any(len(v) > 2 for v in neighbors.values()):
        raise ValueError('Expected one open half-neck contour')
    current = max(ends, key=lambda p: p[1]); previous = None; ordered = []
    while current is not None:
        ordered.append(nodes[current])
        following = [k for k in neighbors[current] if k != previous]
        previous, current = current, following[0] if following else None
    if len(ordered) != len(nodes):
        raise ValueError('Disconnected contour')
    return np.array(ordered)

def locate(path, seed):
    lengths = np.linalg.norm(np.diff(path, axis=0), axis=1)
    cumulative = np.r_[0, np.cumsum(lengths)]
    best = None
    for index, (a, b) in enumerate(zip(path, path[1:])):
        d = b-a; t = np.clip(np.dot(seed-a,d)/np.dot(d,d),0,1)
        candidate = a+d*t; distance = np.linalg.norm(seed-candidate)
        if best is None or distance < best[0]:
            best = (distance, float(cumulative[index]+lengths[index]*t), candidate)
    return best

def at(path, distance):
    lengths = np.linalg.norm(np.diff(path, axis=0), axis=1)
    cumulative = np.r_[0, np.cumsum(lengths)]
    index = min(len(lengths)-1, int(np.searchsorted(cumulative, distance, side='right')-1))
    return path[index]+(path[index+1]-path[index])*(distance-cumulative[index])/lengths[index]

