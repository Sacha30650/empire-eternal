import asyncio
import base64
import json
import os
import urllib.request
import websockets

PORT = int(os.environ.get('EE_CDP_PORT', '9226'))

async def main():
    mission = int(os.environ.get('EE_CAPTURE_MISSION', '1'))
    targets = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
    page = next(t for t in targets if t.get('type') == 'page')
    counter = 0
    pending = {}
    async with websockets.connect(page['webSocketDebuggerUrl'], max_size=10_000_000) as ws:
        async def recv():
            async for raw in ws:
                msg = json.loads(raw)
                if 'id' in msg and msg['id'] in pending:
                    pending.pop(msg['id']).set_result(msg)
        task = asyncio.create_task(recv())
        async def send(method, params=None):
            nonlocal counter
            counter += 1
            fut = asyncio.get_running_loop().create_future()
            pending[counter] = fut
            await ws.send(json.dumps({'id':counter,'method':method,'params':params or {}}))
            return await fut
        async def evaluate(code):
            return await send('Runtime.evaluate',{'expression':code,'returnByValue':True})
        async def shot(path):
            result = await send('Page.captureScreenshot',{'format':'png','fromSurface':True,'captureBeyondViewport':False})
            with open(path,'wb') as handle:
                handle.write(base64.b64decode(result['result']['data']))
        await send('Page.enable'); await send('Runtime.enable')
        await evaluate(f"document.getElementById('resultScreen').classList.add('hidden');__EE_TEST__.switchScene('map');__EE_TEST__.startMission({mission})")
        await asyncio.sleep(1.8)
        await shot('/root/empire-eternal/v4-battle-realtime.png')
        await asyncio.sleep(1.8)
        await shot('/root/empire-eternal/v4-timing-realtime.png')
        state = await evaluate("({scene:__EE_TEST__.getScene(),timing:!document.getElementById('timingEvent').classList.contains('hidden'),timer:document.getElementById('battleTime').textContent,enemies:document.getElementById('enemyCount').textContent})")
        print(json.dumps(state['result']['result']['value'],ensure_ascii=False))
        task.cancel()

asyncio.run(main())
