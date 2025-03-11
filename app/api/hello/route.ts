import { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey, PrivateKeyVariants, Account } from "@aptos-labs/ts-sdk";
import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Message as VercelChatMessage } from "ai";
import { AgentRuntime, LocalSigner, createAptosTools } from "move-agent-kit";
import { NextResponse } from "next/server";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set in .env");
} else {
  console.log("Using ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY.substring(0, 8) + "...");
}

const llm = new ChatAnthropic({
  temperature: 0.7,
  model: "claude-3-5-sonnet-latest",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const textDecoder = new TextDecoder();

async function readStream(stream: any) {
  const reader = stream.getReader();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += textDecoder.decode(value, { stream: true });
  }
  result += textDecoder.decode();
  return result;
}

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === "user") return new HumanMessage(message.content);
  if (message.role === "assistant") return new AIMessage(message.content);
  return new ChatMessage(message.content, message.role);
};

const convertLangChainMessageToVercelMessage = (message: BaseMessage) => {
  if (message._getType() === "human") return { content: message.content, role: "user" };
  if (message._getType() === "ai") return { content: message.content, role: "assistant", tool_calls: (message as AIMessage).tool_calls };
  return { content: message.content, role: message._getType() };
};

async function optimizeYield(agent: AgentRuntime) {
  const balance = await agent.getBalance(agent.signer.account.address.toString());
  const jouleYield = 0.08;
  const panoraYield = 0.06;
  if (jouleYield > panoraYield && balance >= 10) {
    await agent.transferTokens("joule_contract_address", 10);
    return "Moved 10 APT to Joule for 8% yield.";
  } else {
    return `Current yields suboptimal or insufficient balance (${balance} APT)—staying put.`;
  }
}

async function rebalancePortfolio(agent: AgentRuntime) {
  const balance = await agent.getBalance(agent.signer.account.address.toString());
  if (balance >= 5) {
    await agent.transferTokens("lending_contract_address", 5);
    return "Rebalanced: 5 APT moved to lending for stability.";
  }
  return `Portfolio already balanced or insufficient balance (${balance} APT).`;
}

async function createNewWallet() {
  const newAccount = Account.generate(); // Defaults to Legacy Ed25519
  const address = newAccount.accountAddress.toString();
  const privateKey = newAccount.privateKey.toString();
  console.log("Generated private key:", privateKey); // Debug log
  return `New wallet created!\n- Address: ${address}\n- Private Key: ${privateKey}\n\n**Next Steps:**\n1. Copy the private key above.\n2. Open your project's .env file and set:\n   APTOS_PRIVATE_KEY=${privateKey}\n3. Restart the application.\n4. Fund the wallet with APT tokens:\n   - For testnet, visit: https://aptos.dev/faucet\n   - For mainnet, transfer APT from another wallet.\n5. Once funded, I'll use this wallet for all operations.\n⚠️ Store your private key securely and never share it publicly!`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set in .env. Please configure it to use DeFi Maestro.", status: "error" },
        { status: 500 }
      );
    }

    const aptosConfig = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(aptosConfig);
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;

    let aptosAgent: AgentRuntime | undefined;
    if (privateKeyStr) {
      console.log("Raw APTOS_PRIVATE_KEY from .env:", privateKeyStr); // Debug log
      if (!privateKeyStr.startsWith("0x") || privateKeyStr.length !== 66) {
        throw new Error("APTOS_PRIVATE_KEY must be a 32-byte hex string (66 chars with '0x' prefix).");
      }
      try {
        const privateKey = new Ed25519PrivateKey(privateKeyStr);
        const account = Account.fromPrivateKey({ privateKey }); // Legacy Ed25519
        console.log("Derived account address:", account.accountAddress.toString());
        const signer = new LocalSigner(account, Network.MAINNET);
        aptosAgent = new AgentRuntime(signer, aptos, {
          PANORA_API_KEY: process.env.PANORA_API_KEY,
        });
      } catch (e) {
        throw new Error(`Invalid APTOS_PRIVATE_KEY in .env: ${e.message}`);
      }
    }

    const tools = aptosAgent ? createAptosTools(aptosAgent) : [];
    const memory = new MemorySaver();

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are "DeFi Maestro," an AI agent managing DeFi on Aptos. Your capabilities:
        - Optimize yield (e.g., deposit to Joule or Panora) if a wallet is set.
        - Rebalance portfolios for stability if a wallet is set.
        - Check balances and manage risk if a wallet is set.
        - Create a new wallet on Aptos if asked (user must update .env manually).
        When creating a wallet, return the exact output from the createNewWallet function without modifying it or adding code snippets (e.g., no Python examples). If no APTOS_PRIVATE_KEY is set in .env, you can still create wallets but cannot perform onchain actions until it's updated and funded. If funds are low, suggest faucet access (https://aptos.dev/faucet) or user deposits. Be proactive—suggest actions based on conditions. Keep responses concise and actionable.
      `,
    });

    const body = await request.json();
    const messages = (body.messages ?? []).map(convertVercelMessageToLangChainMessage);
    const showIntermediateSteps = body.show_intermediate_steps ?? false;

    if (!showIntermediateSteps) {
      const eventStream = await agent.streamEvents(
        { messages },
        { version: "v2", configurable: { thread_id: "DeFiMaestro" } }
      );
      const textEncoder = new TextEncoder();
      const transformStream = new ReadableStream({
        async start(controller) {
          for await (const { event, data } of eventStream) {
            if (event === "on_chat_model_stream" && data.chunk.content) {
              const content = typeof data.chunk.content === "string" ? data.chunk.content : data.chunk.content.map(c => c.text || "").join("");
              controller.enqueue(textEncoder.encode(content));
            }
          }
          controller.close();
        },
      });
      return new Response(transformStream);
    } else {
      const result = await agent.invoke({ messages });
      const lastMessage = messages[messages.length - 1].content.toLowerCase();

      if (lastMessage.includes("optimize yield")) {
        if (!aptosAgent) {
          result.messages.push(new AIMessage("No wallet set. Please set APTOS_PRIVATE_KEY in .env and fund it first."));
        } else {
          result.messages.push(new AIMessage(await optimizeYield(aptosAgent)));
        }
      } else if (lastMessage.includes("rebalance")) {
        if (!aptosAgent) {
          result.messages.push(new AIMessage("No wallet set. Please set APTOS_PRIVATE_KEY in .env and fund it first."));
        } else {
          result.messages.push(new AIMessage(await rebalancePortfolio(aptosAgent)));
        }
      } else if (lastMessage.includes("create wallet")) {
        result.messages.push(new AIMessage(await createNewWallet()));
      } else if (lastMessage.includes("check my balance")) {
        if (!aptosAgent) {
          result.messages.push(new AIMessage("No wallet set. Please set APTOS_PRIVATE_KEY in .env and fund it first."));
        } else {
          const balance = await aptosAgent.getBalance(aptosAgent.signer.account.address.toString());
          result.messages.push(new AIMessage(`Your current balance is ${balance} APT.`));
        }
      }

      return NextResponse.json(
        { messages: result.messages.map(convertLangChainMessageToVercelMessage) },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Request error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred", status: "error" },
      { status: 500 }
    );
  }
}