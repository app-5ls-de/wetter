#!/usr/bin/env python

import json
from os import path

location_path = path.join(path.realpath(
    path.join(path.dirname(__file__), "..")), 'locations.json')
array = []

with open(location_path) as fd:
    json_data = json.load(fd)

    for element in json_data:
        array.append(dict(sorted(element.items())))

array = sorted(array, key=lambda k: k['name'])
array = sorted(array, key=lambda k: len(k), reverse=True)

with open(location_path, 'w', encoding='utf-8') as f:
    json.dump(array, f, ensure_ascii=False, indent=2)
