"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var ts_sdk_1 = require("@aptos-labs/ts-sdk");
var ts_sdk_2 = require("@aptos-labs/ts-sdk");
var dotenv = require("dotenv");
var express = require("express");
// Load environment variables
dotenv.config();
var AptosChatbot = /** @class */ (function () {
    function AptosChatbot(network) {
        if (network === void 0) { network = ts_sdk_1.Network.MAINNET; }
        var _this = this;
        this.account = null;
        this.network = network;
        var aptosConfig = new ts_sdk_1.AptosConfig({ network: this.network });
        this.aptos = new ts_sdk_1.Aptos(aptosConfig);
        this.app = express();
        this.app.use(express.json());
        this.commands = [
            {
                name: "set-wallet",
                description: "Set wallet using private key",
                execute: function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, this.setWallet(args[0])];
                }); }); }
            },
            {
                name: "balance",
                description: "Check account balance",
                execute: function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, this.getBalance(args[0] || "")];
                }); }); }
            },
            {
                name: "transfer",
                description: "Transfer tokens: transfer <to_address> <amount>",
                execute: function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, this.transferTokens(args[0], args[1])];
                }); }); }
            },
            {
                name: "help",
                description: "Show all commands",
                execute: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, this.showHelp()];
                }); }); }
            }
        ];
        this.setupServer();
    }
    AptosChatbot.prototype.setupServer = function () {
        var _this = this;
        this.app.post('/command', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, command, args, cmd, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, command = _a.command, args = _a.args;
                        cmd = this.commands.find(function (c) { return c.name === command.toLowerCase(); });
                        if (!cmd) return [3 /*break*/, 2];
                        return [4 /*yield*/, cmd.execute(args || [], this.aptos, this.account)];
                    case 1:
                        result = _b.sent();
                        res.json({ result: result });
                        return [3 /*break*/, 3];
                    case 2:
                        res.status(400).json({ error: "Command not found" });
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        this.app.listen(3000, function () {
            console.log("Aptos Chatbot running on ".concat(_this.network, " at http://localhost:3000"));
        });
    };
    AptosChatbot.prototype.setWallet = function (privateKey) {
        return __awaiter(this, void 0, void 0, function () {
            var cleanedKey;
            return __generator(this, function (_a) {
                try {
                    cleanedKey = privateKey.trim();
                    if (cleanedKey.startsWith("0x")) {
                        cleanedKey = cleanedKey.slice(2);
                    }
                    this.account = ts_sdk_1.Account.fromPrivateKey({
                        privateKey: new ts_sdk_2.Ed25519PrivateKey(cleanedKey)
                    });
                    return [2 /*return*/, "Wallet set successfully. Address: ".concat(this.account.accountAddress)];
                }
                catch (error) {
                    return [2 /*return*/, "Error setting wallet: ".concat(error.message)];
                }
                return [2 /*return*/];
            });
        });
    };
    AptosChatbot.prototype.checkAccount = function () {
        if (!this.account) {
            return "Please set wallet first using: set-wallet <private_key>";
        }
        return "";
    };
    AptosChatbot.prototype.getBalance = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var check, resources, coinResource, balance, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        check = this.checkAccount();
                        if (check)
                            return [2 /*return*/, check];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.aptos.getAccountResources({
                                accountAddress: address || this.account.accountAddress.toString()
                            })];
                    case 2:
                        resources = _a.sent();
                        coinResource = resources.find(function (r) { return r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"; });
                        balance = coinResource ? coinResource.data.coin.value : "0";
                        return [2 /*return*/, "Balance: ".concat(Number(balance) / Math.pow(10, 8), " APT")]; // Convert from octa to APT
                    case 3:
                        error_1 = _a.sent();
                        return [2 /*return*/, "Error getting balance: ".concat(error_1.message)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AptosChatbot.prototype.transferTokens = function (toAddress, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var check, transaction, senderAuthenticator, pendingTxn, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        check = this.checkAccount();
                        if (check)
                            return [2 /*return*/, check];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.aptos.transaction.build.simple({
                                sender: this.account.accountAddress.toString(),
                                data: {
                                    function: "0x1::aptos_account::transfer",
                                    functionArguments: [toAddress, BigInt(parseFloat(amount) * Math.pow(10, 8))] // Convert APT to octa
                                },
                            })];
                    case 2:
                        transaction = _a.sent();
                        senderAuthenticator = this.aptos.transaction.sign({
                            signer: this.account,
                            transaction: transaction
                        });
                        return [4 /*yield*/, this.aptos.transaction.submit.simple({
                                transaction: transaction,
                                senderAuthenticator: senderAuthenticator
                            })];
                    case 3:
                        pendingTxn = _a.sent();
                        return [4 /*yield*/, this.aptos.waitForTransaction({ transactionHash: pendingTxn.hash })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, "Transfer successful: ".concat(pendingTxn.hash)];
                    case 5:
                        error_2 = _a.sent();
                        return [2 /*return*/, "Transfer failed: ".concat(error_2.message)];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    AptosChatbot.prototype.showHelp = function () {
        return this.commands.map(function (cmd) { return "".concat(cmd.name, ": ").concat(cmd.description); }).join("\n");
    };
    return AptosChatbot;
}());
var networkArg = (_a = process.argv[2]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
var network;
switch (networkArg) {
    case "testnet":
        network = ts_sdk_1.Network.TESTNET;
        break;
    case "devnet":
        network = ts_sdk_1.Network.DEVNET;
        break;
    case "mainnet":
    default:
        network = ts_sdk_1.Network.MAINNET;
}
var chatbot = new AptosChatbot(network);
