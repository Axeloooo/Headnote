# What is Headnote

Headnote is a chat assistant that answers from your own documents. You add notes, emails, PDFs or sheets to the library, then ask questions in the chat. Each answer lists the passages it used as sources, so you can check where a claim came from.

The assistant is a small LangGraph agent. For every question it first retrieves the most relevant passages from the library, then asks the language model to answer using only that context. If nothing relevant is found, it says so instead of guessing.

Headnote is a portfolio project built while following a public course on LangGraph, FastAPI and ChromaDB.
