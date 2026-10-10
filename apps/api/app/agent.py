from typing import Annotated, Any, TypedDict

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AnyMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph

from app.rag import Retriever

SYSTEM_PROMPT = "You are Headnote, a concise and helpful assistant."


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    context: list[str]


def build_agent(llm: BaseChatModel, retriever: Retriever) -> CompiledStateGraph[Any, Any, Any, Any]:
    """Retrieve relevant documents for the latest message, then answer with the LLM."""

    def retrieve(state: AgentState) -> dict[str, Any]:
        query = str(state["messages"][-1].content)
        return {"context": retriever.search(query)}

    def respond(state: AgentState) -> dict[str, Any]:
        system = SYSTEM_PROMPT
        if state["context"]:
            system += "\n\nUse this context when relevant:\n" + "\n---\n".join(state["context"])
        reply = llm.invoke([SystemMessage(content=system), *state["messages"]])
        return {"messages": [reply]}

    graph = StateGraph(AgentState)
    graph.add_node("retrieve", retrieve)
    graph.add_node("respond", respond)
    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "respond")
    graph.add_edge("respond", END)
    return graph.compile()
