#!/usr/bin/env python

import pandas as pd
from os import path
import requests

url = "https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_warncellids_csv.csv?__blob=publicationFile&v=3"
#url = "http://127.0.0.1:4000/cap_warncellids_csv.csv"
df = pd.read_csv(url, sep=";")
df = df[~df['KENNUNG (NUTS)'].isnull()]
df = df.drop(['KENNUNG (NUTS)', 'KENNUNG (SIGN)', 'KURZNAME'], axis=1)
n = 21
df = df.head(20*n)
df = df.tail(20)

print(n, end='', flush=True)


def f(row):
    print(".", end='', flush=True)
    r = requests.get("https://nominatim.openstreetmap.org/search.php?q=" +
                     row["NAME"]+"&accept-language=de&countrycodes=de&format=jsonv2")
    data = r.json()

    if len(data) == 0:
        return ""

    return data[0]["lat"]+","+data[0]["lon"]


df["LATLON"] = df.apply(f, axis=1)

print("")

main_path = path.realpath(path.join(path.dirname(__file__), ".."))
df.to_csv(path.join(main_path, 'warncellids.csv'), index=False)
