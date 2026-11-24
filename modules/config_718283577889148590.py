import json, os
def read_setting_value(key):
    try:
        with open('seting.json', 'r', encoding='utf-8') as f: return json.load(f).get(key)
    except: return None
def read_prefix(): return read_setting_value('prefix') or "."
def read_admin(): return read_setting_value('admin') or "718283577889148590"

IMEI = "4813c637-799f-4338-aa86-39db31fc7f64-a69b52f9d7f760edf3fd052bcda2542f"
SESSION_COOKIES = {
    "_zlang": "vn",
    "zpsid": "walk.440495455.14.E8FCCJhRPv5bjYQBDjjdaK-e5QKEwrEe3-zIf5qYSSZYf3BeEpI7Rr3RPv4",
    "__zi": "3000.QOBlzDCV2uGerkFzm0LIqM3Ruld12HlKOjUh-Cu86DPktwlp.1",
    "zpw_sek": "cKNT.440495455.a0.5ZD0eUaKh2rgOIb050neMauk3J4NDafjJ6azD0S-EX1FVW4pV7OnAKnl2obICLLuI6kHJ6pK5mzC3PYwosPeMW",
    "zpdid": "41Btd57-eZSS4fgONlx8DXCJcfzKzCWp",
    "zlogin_session": "kW4JGLyjCnIxFnDDLXTbH-Tj249N66H7u6SSLGbQQb-h9WvS1LbkLQic24iJKdu6",
    "app.event.zalo.me": "7171975061104019726"
}
API_KEY = "api_key"
SECRET_KEY = "secret_key"
PREFIX = read_prefix()
ADMIN = read_admin()
