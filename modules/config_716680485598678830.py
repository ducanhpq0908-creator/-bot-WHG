import json, os
def read_setting_value(key):
    try:
        with open('seting.json', 'r', encoding='utf-8') as f: return json.load(f).get(key)
    except: return None
def read_prefix(): return read_setting_value('prefix') or "."
def read_admin(): return read_setting_value('admin') or "716680485598678830"

IMEI = "a67d4bab-0509-43c4-832b-d77cc7bad61e-a69b52f9d7f760edf3fd052bcda2542f"
SESSION_COOKIES = {
    "_zlang": "vn",
    "zpsid": "h_7Q.439590491.2.nJwRY0beL29IzcSu1MXK8dmR9XOwKM4RELnj4swHGVBH5m5R29NntsDeL28",
    "__zi": "3000.QOBlzDCV2uGerkFzm0LLs67RuF3C3HdTRzEfySi35THdrwdv.1",
    "zpw_sek": "E8B7.439590491.a0.gcYhdo8N4TsXOfIms_odge7Umi7OneMQhewItgsVaFABii_omih_uRwiqkUTmPg8XvjUloeasF-3_LaF1vQdgW",
    "zpdid": "41Btar7seZWL4vgNL__8EH8Tbf1N_SOy",
    "zlogin_session": "kW4JGLyjCnIxFnDDLXTbH-Tj249N46jBu6qJMGbGPLEhB05G1LDXMQii14SPKMXLVG",
    "app.event.zalo.me": "7459787975189253135"
}
API_KEY = "api_key"
SECRET_KEY = "secret_key"
PREFIX = read_prefix()
ADMIN = read_admin()
