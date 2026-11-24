import json, os
def read_setting_value(key):
    try:
        with open('seting.json', 'r', encoding='utf-8') as f: return json.load(f).get(key)
    except: return None
def read_prefix(): return read_setting_value('prefix') or "."
def read_admin(): return read_setting_value('admin') or "619216278321871023"

IMEI = "980d6a02-f9a7-4cb9-b669-ad9546ace7de-a69b52f9d7f760edf3fd052bcda2542f"
SESSION_COOKIES = {
    "_zlang": "vn",
    "zpsid": "rBcv.461284808.39.FpZdoQveyo9cpOqvecZp8jiRWHQOMS4Qcb336icHvP9s5wPRhzVa8SLeyo8",
    "__zi": "3000.QOBlzDCV2uGerkFzm0LGq6RQuVJ21HZPOTkeziC86jDksgl-.1",
    "zpw_sek": "VjZ2.461284808.a0.LxJ1hHfZzvEP5dB-SBCCvIgHQOvpYIxK4k5Ogm779zOUoLcK5_4zb63WU8GcZZ77BDJry-5hSx0eihFoKjWCvG",
    "zpdid": "41F-dLpogZiT7fAKN_B0EHmJa99OziCu",
    "zlogin_session": "kW4JGLyjCnIxFnDDLXTbH-Tj249K5cX5uMeGLmXNPbsgAm9U15HYLweh14aRKMPRVG",
    "app.event.zalo.me": "8390328632084507129"
}
API_KEY = "api_key"
SECRET_KEY = "secret_key"
PREFIX = read_prefix()
ADMIN = read_admin()
