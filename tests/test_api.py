from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def demo(monkeypatch):
    monkeypatch.setenv('DEMO_MODE', 'true')


@pytest.mark.parametrize('length', ['one_line', 'standard', 'detailed'])
def test_demo_lengths(length):
    response = client.post('/api/explain', json={'text': 'Neural networks', 'length': length})
    assert response.status_code == 200
    assert response.json()['demo'] is True
    assert response.json()['length'] == length
    assert 'network' in response.json()['explanation'].lower()


@pytest.mark.parametrize('payload', [{'text': ''}, {'text': '   '}, {'text': 'x' * 6001}, {'text': 'hello', 'length': 'huge'}, {'text': 'hello', 'prompt': 'x' * 1001}])
def test_validation(payload):
    assert client.post('/api/explain', json=payload).status_code == 422


def test_live_missing_key(monkeypatch):
    monkeypatch.setenv('DEMO_MODE', 'false')
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    assert client.post('/api/explain', json={'text': 'hello'}).status_code == 503


def test_live_response_and_privacy(monkeypatch):
    monkeypatch.setenv('DEMO_MODE', 'false')
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only')
    fake = AsyncMock()
    fake.responses.create.return_value = SimpleNamespace(output_text='An explanation.', status='completed')
    with patch('backend.main.AsyncOpenAI') as sdk:
        sdk.return_value.__aenter__ = AsyncMock(return_value=fake)
        sdk.return_value.__aexit__ = AsyncMock(return_value=False)
        response = client.post('/api/explain', json={'text': '  APIs  ', 'prompt': 'Use an analogy', 'length': 'one_line'})
    assert response.status_code == 200
    assert response.json()['demo'] is False
    arguments = fake.responses.create.call_args.kwargs
    assert arguments['store'] is False
    assert 'Use an analogy' in arguments['instructions']
    assert 'one concise sentence' in arguments['instructions']
    assert 'APIs' in arguments['input'][0]['content']


def test_health_and_preview():
    assert client.get('/health').json()['demo'] is True
    assert 'QuickClarify' in client.get('/popup.html').text


def test_unknown_demo_is_honest():
    result = client.post('/api/explain', json={'text': 'an unknown concept'}).json()
    assert 'demo preview' in result['explanation']
