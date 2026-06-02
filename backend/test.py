import urllib.request, os
from dotenv import load_dotenv
load_dotenv()
key = os.getenv('OPENAI_API_KEY')
req = urllib.request.Request(
    'https://api.openai.com/v1/models/gpt-4o-realtime-preview',
    headers={'Authorization': f'Bearer {key}'}
)
try:
    r = urllib.request.urlopen(req)
    print('SUCCESS - Realtime API accessible')
except Exception as e:
    print('FAILED:', e)