from __future__ import annotations

import hashlib
import json

import requests

from collect import ROOT, digest_file
from environment import UC_ID, RIVER_ID, CANAL_ID, WATER_ID


def collect():
    for ident in [UC_ID, RIVER_ID, CANAL_ID, WATER_ID, 'inea__canal_vala_bc25__consulta2026']:
        folder = ROOT/'data/raw/meriti'/ident
        provenance = json.loads((folder/'provenance.json').read_text(encoding='utf-8'))
        for entry in provenance['files']:
            target = folder/entry['path']
            if target.exists():
                if digest_file(target) != entry['sha256']:
                    raise ValueError(f'Arquivo local diverge da procedência: {target}')
                continue
            url = entry['url']
            response = requests.get(url, timeout=90)
            response.raise_for_status()
            payload = response.json()
            if 'error' in payload or payload.get('exceededTransferLimit'):
                raise ValueError(f'Resposta incompleta do INEA: {ident}')
            checksum = hashlib.sha256(response.content).hexdigest()
            if checksum != entry['sha256']:
                candidate = target.with_name(f'{target.stem}.candidate-{checksum[:12]}{target.suffix}')
                candidate.write_bytes(response.content)
                raise ValueError(f'A fonte mudou desde a coleta registrada. Nova resposta preservada para revisão: {candidate}')
            target.write_bytes(response.content)
        print(f'{ident}: arquivos conferidos', flush=True)


if __name__ == '__main__':
    collect()
