# Sentinel-Zero Phase 1: Data Seeding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create seed data files for semiconductor companies, ports, connections, and tariffs, plus a seeding script to populate the Supabase database.

**Architecture:** JSON seed files in `data/seed/` directory, TypeScript seed script that reads files and upserts to Supabase. Realistic semiconductor supply chain data for demo purposes.

**Tech Stack:** TypeScript, Supabase, JSON

**Prerequisites:** Phase 0 must be complete (Supabase client configured in `backend/src/lib/supabase.ts`)

**Total Tasks:** 30 TDD slices (D1-D30)

---

## Task D1: Seed data directory

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `data/seed/` directory

**Step 1: Write failing test**
```bash
ls data/seed/
```

**Step 2: Run test - verify it fails**
```
Expected: "No such file or directory"
```

**Step 3: Minimal implementation**
```bash
mkdir -p data/seed
```

**Step 4: Run test - verify it passes**
```bash
ls data/seed/
# Expected: empty directory exists (no error)
```

**Step 5: Commit**
```bash
git add data/
git commit -m "chore: create seed data directory"
```

---

## Task D2: Companies seed file structure

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
ls data/seed/companies.json
```

**Step 2: Run test - verify it fails**
```
Expected: "No such file or directory"
```

**Step 3: Minimal implementation**
```json
[]
```

Save this to `data/seed/companies.json`

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json
# Expected: []
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "chore: add companies seed file structure"
```

---

## Task D3: TSMC data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "TSMC"
```

**Step 2: Run test - verify it fails**
```
Expected: no match (empty array)
```

**Step 3: Minimal implementation**
```json
[
  {
    "id": "tsmc-hsinchu",
    "name": "TSMC",
    "type": "foundry",
    "location": { "lat": 24.7866, "lng": 120.9969 },
    "city": "Hsinchu",
    "country": "Taiwan",
    "country_code": "TW",
    "industry": "semiconductors",
    "description": "Taiwan Semiconductor Manufacturing Company - world's largest dedicated semiconductor foundry",
    "products": ["Logic chips", "SoCs", "Advanced nodes (3nm, 5nm, 7nm)"],
    "annual_revenue_usd": 76000000000,
    "employees": 73000
  }
]
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "TSMC"
# Expected: matches TSMC entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add TSMC seed data"
```

---

## Task D4: Samsung Semiconductor data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Samsung"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "samsung-hwaseong",
  "name": "Samsung Semiconductor",
  "type": "idm",
  "location": { "lat": 37.2326, "lng": 127.1836 },
  "city": "Hwaseong",
  "country": "South Korea",
  "country_code": "KR",
  "industry": "semiconductors",
  "description": "Samsung Electronics semiconductor division - memory and foundry",
  "products": ["DRAM", "NAND Flash", "Foundry services", "Mobile processors"],
  "annual_revenue_usd": 63000000000,
  "employees": 45000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Samsung"
# Expected: matches Samsung entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Samsung Semiconductor seed data"
```

---

## Task D5: Intel data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Intel"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "intel-chandler",
  "name": "Intel",
  "type": "idm",
  "location": { "lat": 33.3062, "lng": -111.8413 },
  "city": "Chandler",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Intel Corporation - CPUs, GPUs, and foundry services",
  "products": ["CPUs", "GPUs", "FPGAs", "Accelerators"],
  "annual_revenue_usd": 54000000000,
  "employees": 131000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Intel"
# Expected: matches Intel entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Intel seed data"
```

---

## Task D6: ASML data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "ASML"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "asml-veldhoven",
  "name": "ASML",
  "type": "equipment",
  "location": { "lat": 51.4101, "lng": 5.4645 },
  "city": "Veldhoven",
  "country": "Netherlands",
  "country_code": "NL",
  "industry": "semiconductors",
  "description": "ASML Holding - sole manufacturer of EUV lithography machines",
  "products": ["EUV lithography systems", "DUV lithography systems", "Metrology equipment"],
  "annual_revenue_usd": 27000000000,
  "employees": 42000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "ASML"
# Expected: matches ASML entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add ASML seed data"
```

---

## Task D7: GlobalFoundries data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "GlobalFoundries"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "globalfoundries-malta",
  "name": "GlobalFoundries",
  "type": "foundry",
  "location": { "lat": 42.9967, "lng": -73.8056 },
  "city": "Malta",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "GlobalFoundries - specialty semiconductor foundry",
  "products": ["Analog chips", "RF chips", "Automotive semiconductors"],
  "annual_revenue_usd": 8100000000,
  "employees": 14000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "GlobalFoundries"
# Expected: matches GlobalFoundries entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add GlobalFoundries seed data"
```

---

## Task D8: SK Hynix data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "SK Hynix"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "skhynix-icheon",
  "name": "SK Hynix",
  "type": "idm",
  "location": { "lat": 37.2793, "lng": 127.4433 },
  "city": "Icheon",
  "country": "South Korea",
  "country_code": "KR",
  "industry": "semiconductors",
  "description": "SK Hynix - memory semiconductor manufacturer",
  "products": ["DRAM", "NAND Flash", "HBM (High Bandwidth Memory)"],
  "annual_revenue_usd": 26000000000,
  "employees": 29000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "SK Hynix"
# Expected: matches SK Hynix entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add SK Hynix seed data"
```

---

## Task D9: Micron data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Micron"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "micron-boise",
  "name": "Micron Technology",
  "type": "idm",
  "location": { "lat": 43.6150, "lng": -116.2023 },
  "city": "Boise",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Micron Technology - memory and storage solutions",
  "products": ["DRAM", "NAND Flash", "SSDs"],
  "annual_revenue_usd": 21000000000,
  "employees": 48000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Micron"
# Expected: matches Micron entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Micron seed data"
```

---

## Task D10: Nvidia data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Nvidia"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "nvidia-santaclara",
  "name": "Nvidia",
  "type": "fabless",
  "location": { "lat": 37.3861, "lng": -122.0839 },
  "city": "Santa Clara",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Nvidia Corporation - GPUs and AI accelerators (fabless)",
  "products": ["GPUs", "AI accelerators", "Networking chips"],
  "annual_revenue_usd": 61000000000,
  "employees": 29600
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Nvidia"
# Expected: matches Nvidia entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Nvidia seed data"
```

---

## Task D11: AMD data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "AMD"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "amd-santaclara",
  "name": "AMD",
  "type": "fabless",
  "location": { "lat": 37.3861, "lng": -121.9772 },
  "city": "Santa Clara",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Advanced Micro Devices - CPUs and GPUs (fabless)",
  "products": ["CPUs", "GPUs", "APUs", "Server processors"],
  "annual_revenue_usd": 23000000000,
  "employees": 26000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "AMD"
# Expected: matches AMD entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add AMD seed data"
```

---

## Task D12: Qualcomm data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Qualcomm"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "qualcomm-sandiego",
  "name": "Qualcomm",
  "type": "fabless",
  "location": { "lat": 32.8998, "lng": -117.2003 },
  "city": "San Diego",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Qualcomm - mobile SoCs and wireless technology (fabless)",
  "products": ["Mobile SoCs (Snapdragon)", "5G modems", "RF front-end chips"],
  "annual_revenue_usd": 35000000000,
  "employees": 51000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Qualcomm"
# Expected: matches Qualcomm entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Qualcomm seed data"
```

---

## Task D13: Foxconn data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Foxconn"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "foxconn-shenzhen",
  "name": "Foxconn",
  "type": "ems",
  "location": { "lat": 22.5431, "lng": 114.0579 },
  "city": "Shenzhen",
  "country": "China",
  "country_code": "CN",
  "industry": "electronics manufacturing",
  "description": "Hon Hai Precision Industry (Foxconn) - electronics contract manufacturer",
  "products": ["Consumer electronics assembly", "Server assembly", "PCB manufacturing"],
  "annual_revenue_usd": 214000000000,
  "employees": 1290000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Foxconn"
# Expected: matches Foxconn entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Foxconn seed data"
```

---

## Task D14: Applied Materials data

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/companies.json`

**Step 1: Write failing test**
```bash
cat data/seed/companies.json | grep "Applied Materials"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the companies array:
```json
{
  "id": "appliedmaterials-santaclara",
  "name": "Applied Materials",
  "type": "equipment",
  "location": { "lat": 37.3486, "lng": -121.9853 },
  "city": "Santa Clara",
  "country": "USA",
  "country_code": "US",
  "industry": "semiconductors",
  "description": "Applied Materials - semiconductor equipment manufacturer",
  "products": ["Deposition equipment", "Etching equipment", "Ion implantation systems"],
  "annual_revenue_usd": 26000000000,
  "employees": 34000
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/companies.json | grep "Applied Materials"
# Expected: matches Applied Materials entry
```

**Step 5: Commit**
```bash
git add data/seed/companies.json
git commit -m "data: add Applied Materials seed data"
```

---

## Task D15: Major ports seed file

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
ls data/seed/ports.json
```

**Step 2: Run test - verify it fails**
```
Expected: "No such file or directory"
```

**Step 3: Minimal implementation**
```json
[]
```

Save this to `data/seed/ports.json`

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json
# Expected: []
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "chore: add ports seed file structure"
```

---

## Task D16: Kaohsiung port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Kaohsiung"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
```json
[
  {
    "id": "port-kaohsiung",
    "name": "Port of Kaohsiung",
    "type": "port",
    "location": { "lat": 22.6163, "lng": 120.2932 },
    "city": "Kaohsiung",
    "country": "Taiwan",
    "country_code": "TW",
    "description": "Taiwan's largest port - key hub for semiconductor exports",
    "annual_teu": 9400000,
    "specialties": ["Electronics", "Semiconductors", "Containers"]
  }
]
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Kaohsiung"
# Expected: matches Kaohsiung entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Kaohsiung seed data"
```

---

## Task D17: Busan port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Busan"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the ports array:
```json
{
  "id": "port-busan",
  "name": "Port of Busan",
  "type": "port",
  "location": { "lat": 35.1028, "lng": 129.0403 },
  "city": "Busan",
  "country": "South Korea",
  "country_code": "KR",
  "description": "South Korea's largest port - electronics and automotive exports",
  "annual_teu": 21590000,
  "specialties": ["Electronics", "Automotive", "Containers"]
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Busan"
# Expected: matches Busan entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Busan seed data"
```

---

## Task D18: Long Beach port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Long Beach"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the ports array:
```json
{
  "id": "port-longbeach",
  "name": "Port of Long Beach",
  "type": "port",
  "location": { "lat": 33.7540, "lng": -118.2169 },
  "city": "Long Beach",
  "country": "USA",
  "country_code": "US",
  "description": "Major US West Coast port - gateway for Asian imports",
  "annual_teu": 9200000,
  "specialties": ["Consumer electronics", "Containers", "Automotive"]
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Long Beach"
# Expected: matches Long Beach entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Long Beach seed data"
```

---

## Task D19: Rotterdam port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Rotterdam"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the ports array:
```json
{
  "id": "port-rotterdam",
  "name": "Port of Rotterdam",
  "type": "port",
  "location": { "lat": 51.9036, "lng": 4.4997 },
  "city": "Rotterdam",
  "country": "Netherlands",
  "country_code": "NL",
  "description": "Europe's largest port - key for ASML equipment exports",
  "annual_teu": 14700000,
  "specialties": ["Machinery", "Electronics", "Chemicals"]
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Rotterdam"
# Expected: matches Rotterdam entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Rotterdam seed data"
```

---

## Task D20: Shanghai port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Shanghai"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the ports array:
```json
{
  "id": "port-shanghai",
  "name": "Port of Shanghai",
  "type": "port",
  "location": { "lat": 31.2304, "lng": 121.4737 },
  "city": "Shanghai",
  "country": "China",
  "country_code": "CN",
  "description": "World's busiest port - major electronics hub",
  "annual_teu": 47030000,
  "specialties": ["Electronics", "Machinery", "Consumer goods"]
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Shanghai"
# Expected: matches Shanghai entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Shanghai seed data"
```

---

## Task D21: Singapore port

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/ports.json`

**Step 1: Write failing test**
```bash
cat data/seed/ports.json | grep "Singapore"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the ports array:
```json
{
  "id": "port-singapore",
  "name": "Port of Singapore",
  "type": "port",
  "location": { "lat": 1.2644, "lng": 103.8220 },
  "city": "Singapore",
  "country": "Singapore",
  "country_code": "SG",
  "description": "Major transshipment hub connecting Asia to the world",
  "annual_teu": 37200000,
  "specialties": ["Transshipment", "Electronics", "Oil and gas"]
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/ports.json | grep "Singapore"
# Expected: matches Singapore entry
```

**Step 5: Commit**
```bash
git add data/seed/ports.json
git commit -m "data: add Port of Singapore seed data"
```

---

## Task D22: Connections seed file

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `data/seed/connections.json`

**Step 1: Write failing test**
```bash
ls data/seed/connections.json
```

**Step 2: Run test - verify it fails**
```
Expected: "No such file or directory"
```

**Step 3: Minimal implementation**
```json
[]
```

Save this to `data/seed/connections.json`

**Step 4: Run test - verify it passes**
```bash
cat data/seed/connections.json
# Expected: []
```

**Step 5: Commit**
```bash
git add data/seed/connections.json
git commit -m "chore: add connections seed file structure"
```

---

## Task D23: TSMC to Nvidia connection

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/connections.json`

**Step 1: Write failing test**
```bash
cat data/seed/connections.json | grep "tsmc.*nvidia"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
```json
[
  {
    "id": "conn-tsmc-nvidia",
    "from_node_id": "tsmc-hsinchu",
    "to_node_id": "nvidia-santaclara",
    "transport_mode": "sea",
    "status": "healthy",
    "is_user_connection": false,
    "materials": ["GPU wafers", "AI accelerator chips"],
    "description": "TSMC manufactures Nvidia GPUs (A100, H100, etc.)",
    "annual_volume_units": 500000000,
    "lead_time_days": 45
  }
]
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/connections.json | grep -i "tsmc"
# Expected: matches connection entry
```

**Step 5: Commit**
```bash
git add data/seed/connections.json
git commit -m "data: add TSMC to Nvidia connection"
```

---

## Task D24: TSMC to AMD connection

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/connections.json`

**Step 1: Write failing test**
```bash
cat data/seed/connections.json | grep "amd"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the connections array:
```json
{
  "id": "conn-tsmc-amd",
  "from_node_id": "tsmc-hsinchu",
  "to_node_id": "amd-santaclara",
  "transport_mode": "sea",
  "status": "healthy",
  "is_user_connection": false,
  "materials": ["CPU wafers", "GPU wafers"],
  "description": "TSMC manufactures AMD Ryzen CPUs and Radeon GPUs",
  "annual_volume_units": 300000000,
  "lead_time_days": 45
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/connections.json | grep -i "amd"
# Expected: matches connection entry
```

**Step 5: Commit**
```bash
git add data/seed/connections.json
git commit -m "data: add TSMC to AMD connection"
```

---

## Task D25: Samsung to Qualcomm connection

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/connections.json`

**Step 1: Write failing test**
```bash
cat data/seed/connections.json | grep "qualcomm"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the connections array:
```json
{
  "id": "conn-samsung-qualcomm",
  "from_node_id": "samsung-hwaseong",
  "to_node_id": "qualcomm-sandiego",
  "transport_mode": "sea",
  "status": "healthy",
  "is_user_connection": false,
  "materials": ["Mobile SoC wafers"],
  "description": "Samsung foundry manufactures some Qualcomm Snapdragon chips",
  "annual_volume_units": 200000000,
  "lead_time_days": 40
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/connections.json | grep -i "qualcomm"
# Expected: matches connection entry
```

**Step 5: Commit**
```bash
git add data/seed/connections.json
git commit -m "data: add Samsung to Qualcomm connection"
```

---

## Task D26: ASML to TSMC connection

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/connections.json`

**Step 1: Write failing test**
```bash
cat data/seed/connections.json | grep "asml"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
Add to the connections array:
```json
{
  "id": "conn-asml-tsmc",
  "from_node_id": "asml-veldhoven",
  "to_node_id": "tsmc-hsinchu",
  "transport_mode": "air",
  "status": "healthy",
  "is_user_connection": false,
  "materials": ["EUV lithography machines", "DUV lithography machines"],
  "description": "ASML supplies critical EUV machines to TSMC for advanced nodes",
  "annual_volume_units": 50,
  "lead_time_days": 365
}
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/connections.json | grep -i "asml"
# Expected: matches connection entry
```

**Step 5: Commit**
```bash
git add data/seed/connections.json
git commit -m "data: add ASML to TSMC connection"
```

---

## Task D27: Tariffs seed file

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `data/seed/tariffs.json`

**Step 1: Write failing test**
```bash
ls data/seed/tariffs.json
```

**Step 2: Run test - verify it fails**
```
Expected: "No such file or directory"
```

**Step 3: Minimal implementation**
```json
[]
```

Save this to `data/seed/tariffs.json`

**Step 4: Run test - verify it passes**
```bash
cat data/seed/tariffs.json
# Expected: []
```

**Step 5: Commit**
```bash
git add data/seed/tariffs.json
git commit -m "chore: add tariffs seed file structure"
```

---

## Task D28: US-China semiconductor tariff

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `data/seed/tariffs.json`

**Step 1: Write failing test**
```bash
cat data/seed/tariffs.json | grep "us-china"
```

**Step 2: Run test - verify it fails**
```
Expected: no match
```

**Step 3: Minimal implementation**
```json
[
  {
    "id": "us-china-chips-2024",
    "from_country": "CN",
    "to_country": "US",
    "product_category": "semiconductors",
    "hs_codes": ["8541", "8542"],
    "rate": 25,
    "effective_date": "2024-01-01",
    "description": "Section 301 tariffs on Chinese semiconductor imports",
    "source_url": "https://ustr.gov/issue-areas/enforcement/section-301-investigations"
  },
  {
    "id": "us-china-equipment-export",
    "from_country": "US",
    "to_country": "CN",
    "product_category": "semiconductor equipment",
    "hs_codes": ["8486"],
    "rate": 0,
    "effective_date": "2022-10-07",
    "description": "Export controls on advanced chip manufacturing equipment to China",
    "source_url": "https://www.bis.doc.gov/index.php/policy-guidance/semiconductor-manufacturing-items"
  },
  {
    "id": "eu-china-ev-chips",
    "from_country": "CN",
    "to_country": "EU",
    "product_category": "ev semiconductors",
    "hs_codes": ["8541.40", "8542.31"],
    "rate": 17.4,
    "effective_date": "2024-10-01",
    "description": "EU countervailing duties on Chinese EV-related semiconductors",
    "source_url": "https://ec.europa.eu/trade/"
  }
]
```

**Step 4: Run test - verify it passes**
```bash
cat data/seed/tariffs.json | grep -i "china"
# Expected: matches tariff entries
```

**Step 5: Commit**
```bash
git add data/seed/tariffs.json
git commit -m "data: add tariff seed data"
```

---

## Task D29: Seed script

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `backend/src/scripts/seed.ts`
- Modify: `backend/package.json`

**Step 1: Write failing test**
```bash
cd backend && npm run seed
```

**Step 2: Run test - verify it fails**
```
Expected: "seed" script not found or file doesn't exist
```

**Step 3: Minimal implementation**

Create `backend/src/scripts/seed.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting database seed...');

  const seedDir = path.join(__dirname, '../../../data/seed');

  // Read seed files
  const companiesPath = path.join(seedDir, 'companies.json');
  const portsPath = path.join(seedDir, 'ports.json');
  const connectionsPath = path.join(seedDir, 'connections.json');
  const tariffsPath = path.join(seedDir, 'tariffs.json');

  // Load data
  const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
  const ports = JSON.parse(fs.readFileSync(portsPath, 'utf-8'));
  const connections = JSON.parse(fs.readFileSync(connectionsPath, 'utf-8'));
  const tariffs = JSON.parse(fs.readFileSync(tariffsPath, 'utf-8'));

  console.log(`Loaded ${companies.length} companies`);
  console.log(`Loaded ${ports.length} ports`);
  console.log(`Loaded ${connections.length} connections`);
  console.log(`Loaded ${tariffs.length} tariffs`);

  // Seed companies (includes nodes like companies and ports)
  const allNodes = [...companies, ...ports];
  console.log(`\nSeeding ${allNodes.length} nodes (companies + ports)...`);

  for (const node of allNodes) {
    const { error } = await supabase
      .from('companies')
      .upsert(node, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding node ${node.id}:`, error.message);
    } else {
      console.log(`  ✓ ${node.name}`);
    }
  }

  // Seed connections
  console.log(`\nSeeding ${connections.length} connections...`);

  for (const conn of connections) {
    const { error } = await supabase
      .from('connections')
      .upsert(conn, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding connection ${conn.id}:`, error.message);
    } else {
      console.log(`  ✓ ${conn.id}`);
    }
  }

  // Seed tariffs
  console.log(`\nSeeding ${tariffs.length} tariffs...`);

  for (const tariff of tariffs) {
    const { error } = await supabase
      .from('tariffs')
      .upsert(tariff, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding tariff ${tariff.id}:`, error.message);
    } else {
      console.log(`  ✓ ${tariff.id}`);
    }
  }

  console.log('\nSeeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
```

Add to `backend/package.json` scripts:
```json
{
  "scripts": {
    "seed": "npx ts-node src/scripts/seed.ts"
  }
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run seed
# Expected: "Seeding complete!" (or connection errors if Supabase not configured)
```

**Step 5: Commit**
```bash
git add backend/src/scripts/seed.ts backend/package.json
git commit -m "feat: add database seed script"
```

---

## Task D30: Seed script runs successfully

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Verify: `backend/src/scripts/seed.ts`

**Step 1: Write failing test**
```bash
cd backend && npm run seed 2>&1 | grep "Seeding complete"
```

**Step 2: Run test - verify it fails**
```
Expected: Empty or error (need valid Supabase credentials)
```

**Step 3: Minimal implementation**
- Ensure `.env` file has valid Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- Ensure Supabase has the required tables created:
  - `companies` table
  - `connections` table
  - `tariffs` table

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run seed 2>&1 | grep "Seeding complete"
# Expected: "Seeding complete!"
```

**Step 5: Commit**
```bash
git add backend/.env.example
git commit -m "docs: add env example for seed script"
```

---

## Verification Checklist

Before considering Phase 1 Data Seeding complete, verify:

- [ ] `data/seed/` directory exists
- [ ] `data/seed/companies.json` has 12 semiconductor companies
- [ ] `data/seed/ports.json` has 6 major ports
- [ ] `data/seed/connections.json` has 4+ supply chain connections
- [ ] `data/seed/tariffs.json` has 3+ tariff entries
- [ ] `npm run seed` in backend directory runs without errors
- [ ] Database contains seeded data (check via Supabase dashboard)

---

## Companies Seeded

| ID | Name | Type | Location |
|----|------|------|----------|
| tsmc-hsinchu | TSMC | foundry | Hsinchu, Taiwan |
| samsung-hwaseong | Samsung Semiconductor | idm | Hwaseong, South Korea |
| intel-chandler | Intel | idm | Chandler, USA |
| asml-veldhoven | ASML | equipment | Veldhoven, Netherlands |
| globalfoundries-malta | GlobalFoundries | foundry | Malta, USA |
| skhynix-icheon | SK Hynix | idm | Icheon, South Korea |
| micron-boise | Micron Technology | idm | Boise, USA |
| nvidia-santaclara | Nvidia | fabless | Santa Clara, USA |
| amd-santaclara | AMD | fabless | Santa Clara, USA |
| qualcomm-sandiego | Qualcomm | fabless | San Diego, USA |
| foxconn-shenzhen | Foxconn | ems | Shenzhen, China |
| appliedmaterials-santaclara | Applied Materials | equipment | Santa Clara, USA |

## Ports Seeded

| ID | Name | Location |
|----|------|----------|
| port-kaohsiung | Port of Kaohsiung | Kaohsiung, Taiwan |
| port-busan | Port of Busan | Busan, South Korea |
| port-longbeach | Port of Long Beach | Long Beach, USA |
| port-rotterdam | Port of Rotterdam | Rotterdam, Netherlands |
| port-shanghai | Port of Shanghai | Shanghai, China |
| port-singapore | Port of Singapore | Singapore |

## Supply Chain Connections Seeded

| From | To | Mode | Materials |
|------|----|------|-----------|
| TSMC | Nvidia | sea | GPU wafers, AI accelerator chips |
| TSMC | AMD | sea | CPU wafers, GPU wafers |
| Samsung | Qualcomm | sea | Mobile SoC wafers |
| ASML | TSMC | air | EUV/DUV lithography machines |
