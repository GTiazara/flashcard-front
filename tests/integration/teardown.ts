export default async function teardown() {
  // Await Mongo/store cleanup BEFORE Playwright kills the server process tree on Windows.
  const url = 'http://127.0.0.1:3001'
  const ready = await fetch(`${url}/__qa/ready`, { signal: AbortSignal.timeout(5_000) }).catch(() => null)
  if (!ready?.ok) return // Startup may have failed before opening the port.
  const identity = await ready.json()
  if (identity.service !== 'flashcard-ephemeral-e2e') throw new Error('Serveur inconnu : arrêt refusé.')
  const stopped = await fetch(`${url}/__qa/shutdown`, {
    method: 'POST', headers: { Origin: 'http://localhost:5174' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!stopped.ok || await stopped.text() !== 'stopped') throw new Error('Nettoyage E2E incomplet.')
  console.info('Nettoyage E2E terminé : store, mongoose et replica set arrêtés.')
}