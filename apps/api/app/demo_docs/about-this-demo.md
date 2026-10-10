# About this demo

This hosted demo runs on free tiers: the web app on Vercel, the API on Render and the database on Neon. The Render free service goes to sleep after fifteen minutes without traffic, so the first request after a quiet spell can take about a minute while it wakes up.

The search index is kept in memory and rebuilt from the bundled sample documents on every start, so documents you add yourself can disappear when the service restarts. Your conversations are kept in the database.

There is no sign-in. Please do not paste anything private into the library or the chat.
