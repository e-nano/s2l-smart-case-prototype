"""Fictional PIN UX checks, not production authentication/security tests.
Run: CHROMIUM_PATH=/usr/bin/chromium python tests/pin_ux_smoke.py
Requires Python Playwright and an installed Chromium browser.
The exact repository HTML/assets are injected without network access.
"""
from pathlib import Path
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
results = []


def check(name):
    results.append(name)


def enter(page, value):
    for digit in value:
        page.locator(f'[data-pin-key="{digit}"]').click()
    page.locator('[data-pin-action="submit"]').click()


def login(page, value):
    enter(page, value)
    page.locator('[data-pin-action="continue"]').click()


def load_document(page):
    # No assertions here about server headers, HTTP caching or deployment.
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<script\b[^>]*src=[^>]+></script>', '', html)
    html = re.sub(r'<link\b[^>]+rel="stylesheet"[^>]*>', '', html)
    page.set_content(html)
    for filename in ['styles.css', 'case-access.css']:
        page.add_style_tag(content=(ROOT / filename).read_text(encoding='utf-8'))
    for filename in ['app.js', 'case-access.js']:
        page.add_script_tag(content=(ROOT / filename).read_text(encoding='utf-8'))


with sync_playwright() as p:
    kwargs = {'headless': True}
    if os.getenv('CHROMIUM_PATH'):
        kwargs['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = p.chromium.launch(**kwargs)
    page = browser.new_page(viewport={'width': 1540, 'height': 1050})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    load_document(page)
    expect(page.locator('.pin-gate')).to_be_visible()
    expect(page.locator('#screen-content')).to_be_hidden()
    expect(page.locator('#measure-button')).to_be_disabled()
    assert page.evaluate('state.coreCount') == 18
    page.evaluate('recordCores()')
    assert page.evaluate('state.coreCount') == 18
    check('signed-out screen hides work and blocks core/measurement controls')

    page.locator('[data-demo="offline"]').click()
    assert page.evaluate('state.coreCount') == 18
    enter(page, '9999')
    expect(page.locator('.pin-status')).to_contain_text('PIN not recognised')
    assert page.evaluate('S2LDemoSession.snapshot().session') is None
    check('wrong PIN rejected; disconnect creates no anonymous core')

    enter(page, '0738')
    expect(page.locator('.pin-person h2')).to_have_text('Alex Taylor')
    expect(page.locator('#screen-content')).to_be_hidden()
    page.locator('[data-pin-action="continue"]').click()
    expect(page.locator('.operator-bar')).to_contain_text('Alex Taylor')
    assert page.evaluate('state.view') == 'map'
    assert page.evaluate('state.online') is False
    check('leading-zero PIN and named confirmation work with installed offline access')

    page.evaluate('recordCores(21)')
    page.locator('[data-pin-action="switch"]').click()
    assert page.evaluate('state.coreCount') == 21
    enter(page, '4826')
    expect(page.locator('.pin-person')).to_contain_text('21 recorded cores')
    page.locator('[data-pin-action="continue"]').click()
    page.locator('[data-demo="capture"]').click()
    assert page.evaluate('state.coreCount') == 25
    page.locator('#measure-button').click()
    expect(page.locator('[data-pin-action="switch"]')).to_be_disabled()
    expect(page.locator('#demo-access-state')).to_be_disabled()
    page.wait_for_function('state.sampleSaved === true')
    events = page.evaluate('S2LDemoSession.snapshot().audit')
    measurements = [e for e in events if e['type'] == 'sample_measurement_demo']
    assert len(measurements) == 1
    measurement = measurements[0]
    assert measurement['membershipId'] == 'demo-member-sam'
    assert [(c['membershipId'], c['count']) for c in measurement['contributions']] == [
        (None, 18), ('demo-member-alex', 3), ('demo-member-sam', 4)
    ]
    assert 'pin' not in json.dumps(events).lower()
    check('handover preserves core contributors and identifies the measurement operator')
    page.locator('#measure-button').click()
    assert len([e for e in page.evaluate('S2LDemoSession.snapshot().audit')
                if e['type'] == 'sample_measurement_demo']) == 1
    check('busy measurement prevents switching; repeated measure does not duplicate demo sample')

    page.locator('[data-view="case"]').click()
    expect(page.locator('.case-association')).to_contain_text('ATV-003')
    expect(page.locator('.case-association select')).to_have_count(0)
    page.locator('[data-pin-action="mismatch"]').click()
    assert page.evaluate('S2LDemoSession.snapshot().configuration.vehicle') == 'ATV-003'
    before = page.evaluate('state.queued')
    page.locator('[data-pin-action="signout"]').click()
    assert page.evaluate('state.queued') == before
    assert page.evaluate('state.sampleSaved') is True
    assert page.evaluate('S2LDemoSession.snapshot().configuration.vehicle') == 'ATV-003'
    check('read-only association and mismatch report; sign-out preserves evidence and configuration')

    page.locator('#demo-access-state').select_option('missing')
    expect(page.locator('.pin-intro h1')).to_have_text('Set up your access')
    expect(page.locator('[data-pin-key="0"]')).to_be_disabled()
    page.locator('#demo-access-state').select_option('expired')
    expect(page.locator('.pin-intro h1')).to_have_text('Refresh your access')
    expect(page.locator('[data-pin-key="0"]')).to_be_disabled()
    check('missing and expired package states cannot sign in')

    page.locator('#reset-button').click()
    page.clock.install()
    for _ in range(3):
        enter(page, '9999')
    expect(page.locator('.pin-status')).to_contain_text('Too many attempts')
    expect(page.locator('[data-pin-key="0"]')).to_be_disabled()
    page.clock.fast_forward(16000)
    expect(page.locator('[data-pin-key="0"]')).to_be_enabled()
    check('bounded demonstration retry delay expires')
    login(page, '0738')

    page.close()
    page = browser.new_page(viewport={'width': 1540, 'height': 1050})
    page.on('pageerror', lambda e: errors.append(str(e)))
    load_document(page)
    expect(page.locator('.pin-gate')).to_be_visible()
    assert page.evaluate('S2LDemoSession.snapshot().session') is None
    check('page restart starts signed out; memory-only demo data reset is explicit')

    for width, height in [(1280, 800), (1024, 768), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.locator('[data-pin-key="0"]').click()
        page.locator('[data-pin-key="clear"]').click()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow at {width}'
    check('keypad interaction and no horizontal overflow at 1280/1024/390px')
    assert errors == [], errors
    check('no JavaScript page errors')
    browser.close()

print(json.dumps({'passed': len(results), 'checks': results}, indent=2))
