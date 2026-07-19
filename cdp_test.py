import asyncio
import json
import os
import time
import urllib.request
import websockets

PORT = int(os.environ.get('EE_CDP_PORT', '9223'))

async def main():
    targets = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
    page = next(t for t in targets if t.get('type') == 'page')
    errors = []
    results = {}
    counter = 0
    pending = {}

    async with websockets.connect(page['webSocketDebuggerUrl'], max_size=8_000_000) as ws:
        async def send(method, params=None):
            nonlocal counter
            counter += 1
            ident = counter
            await ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
            fut = asyncio.get_running_loop().create_future()
            pending[ident] = fut
            return await fut

        async def receiver():
            async for raw in ws:
                msg = json.loads(raw)
                if 'id' in msg and msg['id'] in pending:
                    pending.pop(msg['id']).set_result(msg)
                elif msg.get('method') == 'Runtime.exceptionThrown':
                    errors.append(msg['params']['exceptionDetails'].get('text', 'runtime exception'))
                elif msg.get('method') == 'Log.entryAdded':
                    entry = msg['params']['entry']
                    if entry.get('level') == 'error':
                        errors.append(entry.get('text', 'console error'))

        recv_task = asyncio.create_task(receiver())
        await send('Runtime.enable')
        await send('Log.enable')
        await send('Page.enable')
        await asyncio.sleep(1.5)

        async def evaluate(expression, await_promise=False):
            reply = await send('Runtime.evaluate', {
                'expression': expression,
                'returnByValue': True,
                'awaitPromise': await_promise
            })
            if 'error' in reply:
                raise RuntimeError(reply['error'])
            result = reply.get('result', {}).get('result', {})
            if result.get('subtype') == 'error':
                raise RuntimeError(result.get('description'))
            return result.get('value')

        results['api'] = await evaluate("typeof window.__EE_TEST__")
        results['initial_scene'] = await evaluate("__EE_TEST__.getScene()")
        results['initial_power'] = await evaluate("__EE_TEST__.teamPower()")
        results['manifest'] = await evaluate("document.querySelector('link[rel=manifest]').getAttribute('href')")

        await evaluate("__EE_TEST__.switchScene('map')")
        results['map_scene'] = await evaluate("__EE_TEST__.getScene()")

        await evaluate("__EE_TEST__.startMission(1)")
        await asyncio.sleep(.25)
        results['battle_start'] = await evaluate("({scene:__EE_TEST__.getScene(),energy:__EE_TEST__.getState().energy,battles:__EE_TEST__.getState().battles})")

        await evaluate("__EE_TEST__.useSkill('bulwark');__EE_TEST__.useSkill('volley');__EE_TEST__.useSkill('nova')")
        await asyncio.sleep(.1)
        results['skill_count'] = await evaluate("__EE_TEST__.getState().skills")
        results['skills_visible'] = await evaluate("!document.getElementById('combatActions').classList.contains('hidden')")
        results['install_hidden_in_battle'] = await evaluate("document.getElementById('installBtn').classList.contains('hidden')")

        await evaluate("__EE_TEST__.triggerTiming()")
        await asyncio.sleep(.15)
        results['timing_visible'] = await evaluate("!document.getElementById('timingEvent').classList.contains('hidden')")
        await evaluate("document.getElementById('timingTarget').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await asyncio.sleep(.85)
        results['timing_resolved'] = await evaluate("document.getElementById('timingEvent').classList.contains('hidden')")

        await evaluate("__EE_TEST__.finishBattle(true)")
        await asyncio.sleep(1.0)
        results['result_visible'] = await evaluate("!document.getElementById('resultScreen').classList.contains('hidden')")
        results['result_title'] = await evaluate("document.getElementById('resultTitle').textContent")
        await evaluate("document.getElementById('resultContinue').click()")
        await asyncio.sleep(.2)
        results['progression'] = await evaluate("({campaign:__EE_TEST__.getState().campaign,wins:__EE_TEST__.getState().wins,stars:__EE_TEST__.getState().nodeStars['1'],scene:__EE_TEST__.getScene(),saved:!!localStorage.getItem('empire-eternal-v4')})")

        await evaluate("__EE_TEST__.switchScene('portal');EE.summon()")
        await asyncio.sleep(1.6)
        results['portal'] = await evaluate("({pulls:__EE_TEST__.getState().portalPulls,free:__EE_TEST__.getState().freePullDate,heroes:__EE_TEST__.getState().heroes.length})")
        await evaluate("EE.upgradeBuilding('castle')")
        results['building'] = await evaluate("({level:__EE_TEST__.getState().buildings.castle,upgrades:__EE_TEST__.getState().upgrades})")

        results['sw'] = await evaluate("navigator.serviceWorker.ready.then(r=>({active:!!r.active,scope:r.scope}))", True)
        results['errors'] = errors

        checks = {
            'api': results['api'] == 'object',
            'initial_scene': results['initial_scene'] == 'base',
            'power': isinstance(results['initial_power'], (int,float)) and results['initial_power'] > 0,
            'map': results['map_scene'] == 'map',
            'battle_energy': results['battle_start']['scene'] == 'battle' and results['battle_start']['energy'] == 93,
            'skills': results['skill_count'] >= 3 and results['skills_visible'],
            'install_overlay': results['install_hidden_in_battle'],
            'timing_event': results['timing_visible'] and results['timing_resolved'],
            'result': results['result_visible'] and results['result_title'] == 'VICTOIRE',
            'progression': results['progression']['campaign'] == 2 and results['progression']['wins'] == 1 and results['progression']['stars'] >= 1 and results['progression']['scene'] == 'map' and results['progression']['saved'],
            'portal': results['portal']['pulls'] == 1 and bool(results['portal']['free']) and results['portal']['heroes'] >= 3,
            'building': results['building']['level'] == 2 and results['building']['upgrades'] == 1,
            'service_worker': results['sw']['active'],
            'runtime_errors': not errors,
        }
        results['checks'] = checks
        results['passed'] = all(checks.values())
        print(json.dumps(results, ensure_ascii=False, indent=2))
        recv_task.cancel()
        if not results['passed']:
            raise SystemExit(1)

if __name__ == '__main__':
    asyncio.run(main())
