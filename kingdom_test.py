import asyncio
import base64
import json
import urllib.request
import websockets

PORT = 9223

async def main():
    targets = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
    page = next(t for t in targets if t.get('type') == 'page')
    pending = {}
    counter = 0
    errors = []
    async with websockets.connect(page['webSocketDebuggerUrl'], max_size=10_000_000) as ws:
        async def receiver():
            async for raw in ws:
                msg = json.loads(raw)
                if 'id' in msg and msg['id'] in pending:
                    pending.pop(msg['id']).set_result(msg)
                elif msg.get('method') == 'Runtime.exceptionThrown':
                    errors.append(msg['params']['exceptionDetails'].get('text', 'runtime exception'))
        task = asyncio.create_task(receiver())
        async def send(method, params=None):
            nonlocal counter
            counter += 1
            future = asyncio.get_running_loop().create_future()
            pending[counter] = future
            await ws.send(json.dumps({'id': counter, 'method': method, 'params': params or {}}))
            return await future
        async def evaluate(code):
            response = await send('Runtime.evaluate', {'expression': code, 'returnByValue': True})
            result = response['result']['result']
            if result.get('subtype') == 'error':
                raise RuntimeError(result.get('description'))
            return result.get('value')
        await send('Runtime.enable')
        await send('Page.enable')
        await send('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 2, 'mobile': True})
        await send('Page.navigate', {'url': 'about:blank'})
        await asyncio.sleep(.2)
        await send('Storage.clearDataForOrigin', {'origin': 'http://127.0.0.1:8080', 'storageTypes': 'all'})
        await send('Page.navigate', {'url': 'http://127.0.0.1:8080/?capture=base'})
        await asyncio.sleep(1.2)
        initial = await evaluate("({state:__EE_TEST__.getState(),rates:__EE_TEST__.kingdomRates(),power:__EE_TEST__.teamPower()})")
        await evaluate("__EE_TEST__.showKingdom('overview')")
        await asyncio.sleep(.15)
        overview = await evaluate("({open:!document.getElementById('sheet').classList.contains('hidden'),tabs:document.querySelectorAll('.kingdomTabs button').length,workers:document.querySelectorAll('.workerLine').length,title:document.querySelector('.sheetTitle').textContent})")
        image = await send('Page.captureScreenshot', {'format': 'png', 'fromSurface': True, 'captureBeyondViewport': False})
        with open('/root/empire-eternal/v5-kingdom-mobile.png', 'wb') as handle:
            handle.write(base64.b64decode(image['result']['data']))
        await evaluate("__EE_TEST__.assignWorker('mine',1);__EE_TEST__.setDecree('trade')")
        changed = await evaluate("({state:__EE_TEST__.getState(),rates:__EE_TEST__.kingdomRates(),power:__EE_TEST__.teamPower()})")
        await evaluate("__EE_TEST__.fulfillOrder('granary')")
        order = await evaluate("({state:__EE_TEST__.getState(),council:document.getElementById('sheetContent').textContent.includes('Requête accomplie')})")
        checks = {
            'v5_state': initial['state']['version'] == 5 and initial['state']['food'] >= 899,
            'economy_positive': initial['rates']['gold'] > 0 and initial['rates']['foodNet'] > 0,
            'dashboard': overview == {'open': True, 'tabs': 3, 'workers': 3, 'title': 'Le royaume vivant'},
            'worker_assignment': changed['state']['kingdom']['workers']['mine'] == 5,
            'decree_effect': changed['state']['kingdom']['decree'] == 'trade' and changed['rates']['gold'] > initial['rates']['gold'],
            'order': order['state']['kingdom']['orders'].get('granary') is True and order['state']['kingdom']['prosperity'] >= 18 and order['council'],
            'no_runtime_errors': not errors,
        }
        print(json.dumps({'initial': initial, 'changedRates': changed['rates'], 'overview': overview, 'order': order, 'checks': checks, 'passed': all(checks.values()), 'errors': errors}, ensure_ascii=False, indent=2))
        task.cancel()
        if not all(checks.values()):
            raise SystemExit(1)

asyncio.run(main())
