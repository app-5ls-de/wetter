#!/usr/bin/env python

import yaml
import json
from os import walk, path

main_path = path.realpath(path.join(path.dirname(__file__), ".."))

list_locations = []
locations_path = path.join(main_path, "_locations/")

# from https://stackoverflow.com/a/3207973
_, _, filenames = next(walk(locations_path))

for location in filenames:
    with open(path.join(locations_path, location), "r") as f:
        data_yaml, data_md = f.read()[3:].split("\n---\n")
        try:
            parsed_yaml = yaml.safe_load(data_yaml)
            location_dict = {
                "name": location[:-3],
                "data": parsed_yaml,
                "markdown": data_md
            }
            list_locations.append(location_dict)

        except yaml.YAMLError as exc:
            print(exc)

list_locations = sorted(list_locations, key=lambda k: k['name'])

with open(path.join(main_path, 'locations.json'), 'w', encoding='utf-8') as f:
    json.dump(list_locations, f, ensure_ascii=False, indent=2)
