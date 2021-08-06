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
                "id": location[:-3],
                "name": parsed_yaml["location"],
                "lat": parsed_yaml["coordinates"]["lat"],
                "lon": parsed_yaml["coordinates"]["lon"],
                "meteoblue_src": parsed_yaml["meteoblue"]["srcset"],
                "meteoblue_id": parsed_yaml["meteoblue"]["id"],
            }
            if "simple" in parsed_yaml["meteoblue"].keys():
                location_dict["meteoblue_simple"] = parsed_yaml["meteoblue"]["simple"]
            if "district" in parsed_yaml.keys():
                location_dict["district"] = parsed_yaml["district"]
            if "country" in parsed_yaml.keys():
                location_dict["country"] = parsed_yaml["country"]
            if "accuweather" in parsed_yaml.keys():
                location_dict["accuweather"] = parsed_yaml["accuweather"]
            if "windguru" in parsed_yaml.keys():
                location_dict["windguru_s"] = parsed_yaml["windguru"]["s"]
                location_dict["windguru_uid"] = parsed_yaml["windguru"]["uid"]
            if "dwd" in parsed_yaml.keys():
                location_dict["dwd_warncellid"] = parsed_yaml["dwd"]["warncellid"]
            if "daswetter" in parsed_yaml.keys():
                location_dict["daswetter"] = parsed_yaml["daswetter"]
            if "windy" in parsed_yaml.keys():
                location_dict["windy_waves"] = parsed_yaml["windy"]["waves"]
            if "daswetter" in parsed_yaml.keys():
                location_dict["daswetter"] = parsed_yaml["daswetter"]

            location_dict = dict(sorted(location_dict.items()))
            list_locations.append(location_dict)

        except yaml.YAMLError as exc:
            print(exc)

list_locations = sorted(list_locations, key=lambda k: k['name'])

with open(path.join(main_path, 'locations.json'), 'w', encoding='utf-8') as f:
    json.dump(list_locations, f, ensure_ascii=False, indent=2)
