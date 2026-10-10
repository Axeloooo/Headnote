# How Headnote works

The web app is a React and TypeScript single page app. It talks to a FastAPI service over a small JSON API: `POST /chat` sends a message, `POST /documents` adds documents, `GET /documents` lists the library and `GET /conversations` lists recent chats.

When a document is added, its text is split into chunks of about 800 characters and stored in a ChromaDB collection. Each chunk is tagged with the id of its document, which is how an answer can point back to a source.

Conversations and the document list are stored in a SQL database through SQLAlchemy. Locally that is SQLite; in production it is PostgreSQL.

Chat answers come from Anthropic's Claude models (Haiku by default). Runs can be traced in LangSmith.
