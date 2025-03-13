import { ethers, hexlify, randomBytes } from "ethers"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import fs from "fs/promises"

// User Configuration
const CONCURRENT_THREADS = 10 // Number of concurrent threads
const TOTAL_WALLETS = 100 // Total number of wallets to generate
const TIMEOUT_MS = 30000 // 30 seconds timeout
const REFERRAL_CODE = "EL5FQAHT"

// API Configuration
const API_URL_VERIFY = "https://api1-pp.klokapp.ai/v1/verify"
const API_URL_ASK = "https://api1-pp.klokapp.ai/v1/chat"
const MODELS = ["llama-3.3-70b-instruct", "deepseek-r1", "gpt-4o-mini"]

// Create axios instance with timeout
const axiosInstance = axios.create({
  timeout: TIMEOUT_MS,
})

// Random question generator components
const subjects = [
  "chemicals",
  "sports",
  "galaxies",
  "ancient civilizations",
  "artificial intelligence",
  "cryptocurrency",
  "neuroscience",
  "space-time theory",
  "quantum computing",
  "blockchain",
  "renewable energy",
  "genetic engineering",
  "virtual reality",
  "cybersecurity",
  "robotics",
  "machine learning",
  "space exploration",
  "sustainable agriculture",
  "bioinformatics",
  "nanotechnology",
  "climate science",
  "digital privacy",
  "autonomous vehicles",
  "5G networks",
  "cloud computing",
  "IoT devices",
  "augmented reality",
  "digital currencies",
  "smart cities",
  "renewable resources",
  "social media",
  "digital marketing",
  "e-commerce",
  "fintech",
  "biotech",
  "clean energy",
  "data science",
  "edge computing",
  "quantum cryptography",
  "neural networks",
  "deep learning",
  "computer vision",
  "natural language processing",
  "cyber warfare",
  "digital transformation",
  "space tourism",
  "metaverse",
  "web3",
]

const verbs = [
  "affect",
  "influence",
  "change",
  "challenge",
  "disrupt",
  "improve",
  "define",
  "transform",
  "explain",
  "analyze",
  "revolutionize",
  "enhance",
  "optimize",
  "accelerate",
  "streamline",
  "modernize",
  "innovate",
  "evolve",
  "shape",
  "impact",
  "advance",
  "facilitate",
  "enable",
  "empower",
  "drive",
  "catalyze",
  "redefine",
  "strengthen",
  "optimize",
  "leverage",
  "integrate",
  "scale",
  "pioneer",
  "augment",
  "amplify",
  "modify",
  "regulate",
  "harmonize",
  "synchronize",
  "democratize",
  "decentralize",
  "automate",
  "digitize",
  "personalize",
]

const contexts = [
  "human behavior",
  "modern technology",
  "global economy",
  "climate change",
  "scientific research",
  "historical events",
  "public policy",
  "cognitive science",
  "sustainable development",
  "social interactions",
  "business innovation",
  "environmental conservation",
  "healthcare systems",
  "education methods",
  "urban development",
  "rural communities",
  "international relations",
  "economic inequality",
  "technological advancement",
  "cultural preservation",
  "mental health",
  "physical wellness",
  "social mobility",
  "market dynamics",
  "workplace culture",
  "consumer behavior",
  "political systems",
  "democratic processes",
  "digital transformation",
  "social justice",
  "economic growth",
  "environmental protection",
  "data privacy",
  "cybersecurity measures",
  "technological ethics",
  "innovation ecosystems",
  "startup environments",
  "corporate governance",
  "regulatory frameworks",
  "sustainable practices",
  "digital literacy",
  "workforce development",
  "community building",
  "social cohesion",
  "economic resilience",
  "technological adoption",
  "future of work",
  "digital inclusion",
  "global connectivity",
  "cultural exchange",
]

const questionStarters = [
  "How do",
  "Why do",
  "What causes",
  "What impact does",
  "How might",
  "What role does",
  "What challenges arise from",
  "What solutions exist for",
  "How can we leverage",
  "What are the implications of",
  "How does the evolution of",
  "What opportunities emerge from",
  "How can we optimize",
  "What strategies exist for",
  "How do we balance",
  "What is the relationship between",
  "How can we measure the impact of",
  "What are the long-term effects of",
  "How can we improve",
  "What factors influence",
  "How do we address challenges in",
  "What innovations drive",
  "How can we accelerate",
  "What barriers exist in",
  "How do we maximize the potential of",
  "What trends shape",
  "How can we enhance",
  "What methods exist for analyzing",
  "How do we ensure sustainable",
  "What frameworks guide",
  "How do we implement",
  "What metrics evaluate",
  "How can we transform",
  "What approaches optimize",
  "How do we integrate",
  "What systems support",
  "How can we revolutionize",
  "What principles govern",
  "How do we adapt",
  "What mechanisms enable",
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

const generateRandomQuestion = () => {
  return `${randomItem(questionStarters)} ${randomItem(subjects)} ${randomItem(verbs)} ${randomItem(contexts)}?`
}

class WalletProcessor {
  constructor(totalWallets, numThreads) {
    this.totalWallets = totalWallets
    this.numThreads = numThreads
    this.processedWallets = []
    this.currentWalletIndex = 0
    this.mutex = new Mutex()
  }

  async saveWallet(walletData) {
    await this.mutex.acquire()
    try {
      this.processedWallets.push(walletData)
      await fs.writeFile("klok.json", JSON.stringify(this.processedWallets, null, 2))
    } finally {
      this.mutex.release()
    }
  }

  async getNextWalletIndex() {
    await this.mutex.acquire()
    try {
      if (this.currentWalletIndex < this.totalWallets) {
        return this.currentWalletIndex++
      }
      return null
    } finally {
      this.mutex.release()
    }
  }

  async askQuestion(sessionToken, questionNumber, walletIndex, retryCount = 0) {
    const maxRetries = 3
    const question = generateRandomQuestion()
    const model = randomItem(MODELS)

    const askPayload = {
      id: uuidv4(),
      title: "",
      messages: [{ role: "user", content: question }],
      sources: [],
      model: model,
      created_at: new Date().toISOString(),
      language: "english",
    }

    console.log(`Wallet ${walletIndex + 1} - Question ${questionNumber} (Attempt ${retryCount + 1}):`, question)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, TIMEOUT_MS)

      const askResponse = await axiosInstance.post(API_URL_ASK, askPayload, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        responseType: "stream",
        signal: controller.signal,
      })

      let responseData = ""
      await new Promise((resolve, reject) => {
        const responseTimeout = setTimeout(() => {
          reject(new Error("Response stream timeout"))
        }, TIMEOUT_MS)

        askResponse.data.on("data", (chunk) => {
          responseData += chunk.toString()
        })

        askResponse.data.on("end", () => {
          clearTimeout(responseTimeout)
          resolve()
        })

        askResponse.data.on("error", (error) => {
          clearTimeout(responseTimeout)
          reject(error)
        })
      })

      clearTimeout(timeout)
      console.log(`Wallet ${walletIndex + 1} - Response ${questionNumber} completed`)
      return true
    } catch (error) {
      const errorStr = String(error.message || error)
      console.error(`Wallet ${walletIndex + 1} - Question ${questionNumber} Error:`, errorStr)

      // Check for various error conditions
      if (error.code === "ECONNABORTED" || errorStr.includes("timeout")) {
        console.log(`Wallet ${walletIndex + 1} - Timeout, retrying...`)
        if (retryCount < maxRetries) {
          await sleep(5000)
          return await this.askQuestion(sessionToken, questionNumber, walletIndex, retryCount + 1)
        }
        return true
      }

      if (error.response?.status === 429) {
        console.log(`Wallet ${walletIndex + 1} - Rate limit reached, stopping...`)
        return false
      }

      if (retryCount < maxRetries && (errorStr.includes("aborted") || error.code === "ECONNRESET" || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
        console.log(`Wallet ${walletIndex + 1} - Retrying question ${questionNumber} after 5 seconds...`)
        await sleep(5000)
        return await this.askQuestion(sessionToken, questionNumber, walletIndex, retryCount + 1)
      }

      return true
    }
  }

  async processWalletThread() {
    while (true) {
      const walletIndex = await this.getNextWalletIndex()
      if (walletIndex === null) break

      const wallet = ethers.Wallet.createRandom()
      const address = wallet.address
      const nonce = hexlify(randomBytes(32)).slice(2)
      const issuedAt = new Date().toISOString()
      const message = `klokapp.ai wants you to sign in with your Ethereum account:\n${address}\n\n\nURI: https://klokapp.ai/\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${issuedAt}`

      try {
        const signedMessage = await wallet.signMessage(message)
        const verifyResponse = await axiosInstance.post(
          API_URL_VERIFY,
          {
            signedMessage,
            message,
            referral_code: REFERRAL_CODE,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        )

        console.log(`Wallet ${walletIndex + 1}: Verification Success`)
        const sessionToken = verifyResponse.data.session_token

        for (let i = 0; i < 10; i++) {
          const continueProcessing = await this.askQuestion(sessionToken, i + 1, walletIndex)
          if (!continueProcessing) break
          await sleep(2000)
        }

        await this.saveWallet({
          publicKey: wallet.address,
          privateKey: wallet.privateKey,
        })

        console.log(`Wallet ${walletIndex + 1} completed and saved`)
      } catch (error) {
        console.error(`Wallet ${walletIndex + 1}: Error:`, error.response?.data || error.message)
      }
    }
  }

  async run() {
    console.log(`Starting processing of ${this.totalWallets} wallets with ${this.numThreads} concurrent threads`)
    const threads = Array.from({ length: this.numThreads }, () => this.processWalletThread())
    await Promise.all(threads)
    console.log(`Completed processing ${this.totalWallets} wallets`)
  }
}

// Mutex class remains the same
class Mutex {
  constructor() {
    this.queue = []
    this.locked = false
  }

  async acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      next()
    } else {
      this.locked = false
    }
  }
}

async function main() {
  const processor = new WalletProcessor(TOTAL_WALLETS, CONCURRENT_THREADS)
  await processor.run()
}

main().catch(console.error)
