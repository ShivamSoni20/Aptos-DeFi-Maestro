import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
import { Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import * as dotenv from "dotenv";
import * as express from "express";

// Load environment variables
dotenv.config();

interface Command {
    name: string;
    description: string;
    execute: (args: string[], aptos: Aptos, account: Account | null) => Promise<string>;
}

class AptosChatbot {
    private account: Account | null = null;
    private network: Network;
    private commands: Command[];
    private app: express.Express;
    private aptos: Aptos;

    constructor(network: Network = Network.MAINNET) {
        this.network = network;
        const aptosConfig = new AptosConfig({ network: this.network });
        this.aptos = new Aptos(aptosConfig);
        this.app = express();
        this.app.use(express.json());

        this.commands = [
            {
                name: "set-wallet",
                description: "Set wallet using private key",
                execute: async (args) => this.setWallet(args[0])
            },
            {
                name: "balance",
                description: "Check account balance",
                execute: async (args) => this.getBalance(args[0] || "")
            },
            {
                name: "transfer",
                description: "Transfer tokens: transfer <to_address> <amount>",
                execute: async (args) => this.transferTokens(args[0], args[1])
            },
            {
                name: "help",
                description: "Show all commands",
                execute: async () => this.showHelp()
            }
        ];

        this.setupServer();
    }

    private setupServer() {
        this.app.post('/command', async (req, res) => {
            const { command, args } = req.body;
            const cmd = this.commands.find(c => c.name === command.toLowerCase());
            
            if (cmd) {
                const result = await cmd.execute(args || [], this.aptos, this.account);
                res.json({ result });
            } else {
                res.status(400).json({ error: "Command not found" });
            }
        });

        this.app.listen(3000, () => {
            console.log(`Aptos Chatbot running on ${this.network} at http://localhost:3000`);
        });
    }

    private async setWallet(privateKey: string): Promise<string> {
        try {
            let cleanedKey = privateKey.trim();
            if (cleanedKey.startsWith("0x")) {
                cleanedKey = cleanedKey.slice(2);
            }

            this.account = Account.fromPrivateKey({
                privateKey: new Ed25519PrivateKey(cleanedKey)
            });
            return `Wallet set successfully. Address: ${this.account.accountAddress}`;
        } catch (error) {
            return `Error setting wallet: ${error.message}`;
        }
    }

    private checkAccount(): string {
        if (!this.account) {
            return "Please set wallet first using: set-wallet <private_key>";
        }
        return "";
    }

    private async getBalance(address: string): Promise<string> {
        const check = this.checkAccount();
        if (check) return check;

        try {
            const resources = await this.aptos.getAccountResources({
                accountAddress: address || this.account!.accountAddress.toString()
            });
            const coinResource = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
            const balance = coinResource ? (coinResource.data as any).coin.value : "0";
            return `Balance: ${Number(balance) / 10**8} APT`; // Convert from octa to APT
        } catch (error) {
            return `Error getting balance: ${error.message}`;
        }
    }

    private async transferTokens(toAddress: string, amount: string): Promise<string> {
        const check = this.checkAccount();
        if (check) return check;

        try {
            const transaction = await this.aptos.transaction.build.simple({
                sender: this.account!.accountAddress.toString(),
                data: {
                    function: "0x1::aptos_account::transfer",
                    functionArguments: [toAddress, BigInt(parseFloat(amount) * 10**8)] // Convert APT to octa
                },
            });

            const senderAuthenticator = this.aptos.transaction.sign({
                signer: this.account!,
                transaction
            });

            const pendingTxn = await this.aptos.transaction.submit.simple({
                transaction,
                senderAuthenticator
            });

            await this.aptos.waitForTransaction({ transactionHash: pendingTxn.hash });
            return `Transfer successful: ${pendingTxn.hash}`;
        } catch (error) {
            return `Transfer failed: ${error.message}`;
        }
    }

    private showHelp(): string {
        return this.commands.map(cmd => `${cmd.name}: ${cmd.description}`).join("\n");
    }
}

const networkArg = process.argv[2]?.toLowerCase();
let network: Network;
switch (networkArg) {
    case "testnet":
        network = Network.TESTNET;
        break;
    case "devnet":
        network = Network.DEVNET;
        break;
    case "mainnet":
    default:
        network = Network.MAINNET;
}

const chatbot = new AptosChatbot(network);