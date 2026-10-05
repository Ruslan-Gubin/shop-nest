import { Injectable } from "@nestjs/common";
import { execSync, spawn, spawnSync } from "child_process";

// opencode -s ses_ef54b847affe2GPGDx9bRu1mS0
@Injectable()
export class OpenCodeService {
  private readonly baseUrl = "http://localhost:8080/v1/chat/completions";
  private readonly modelName = "gemma-4-E2B_q4_0-it";
  private idleTimer: NodeJS.Timeout | null = null;
  private static readonly IDLE_TIMEOUT_MS = 600_000; // 10min
  private modelOpencodeVariant = 0;

  async query(prompt: string) {
    const isReadyLocal = await this.checkLocalLLM();

    if (isReadyLocal) {
      return this.localLLM(prompt);
    } else if (!isReadyLocal) {
      return this.opencodeLLM(prompt);
    }

    throw "Ни одна LLM не готова к работе";
  }

  async localLLM(prompt: string): Promise<string> {
    return await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 1.0,
        top_p: 0.95,
        top_k: 64,
        max_tokens: 4096, // 2048
      }),
    })
      .then((response) => response.json())
      .then((response) => {
        if (Object.hasOwn(response, "error") && typeof response.error.message === "string") {
          throw response.error.message;
        }

        return response.choices?.[0]?.message?.content ?? "";
      })
      .catch((error) => {
        throw `Запрос к локальной LLM завершился с ошибкой: ${error}`;
      });
  }

  private async checkLocalLLM() {
    return fetch("http://127.0.0.1:8080/health", { signal: AbortSignal.timeout(2000) })
      .then((response) => {
        this.touchLocalLLM();
        return response.status === 200 && response.ok;
      })
      .catch(async () => {
        const isBusy = this.isPortBusy(8080);

        if (isBusy) {
          throw "порт 8080 занят, возможно идет запуск модели";
        } else {
          const child = spawn(
            "/opt/homebrew/bin/llama-server",
            [
              "-m",
              "/Users/i-mobi/llm-models/gemma-4-E2B_q4_0-it.gguf",
              "-n",
              "2048",
              "--temp",
              "1.0",
              "--top-p",
              "0.95",
              "--top-k",
              "64",
              "-c",
              "8192",
              "-ngl",
              "99",
              "-t",
              "4",
              "-fa",
              "on",
              "--port",
              "8080",
            ],
            { detached: true, stdio: "ignore" },
          );

          return await new Promise<boolean>((resolve) => {
            child.on("error", () => {
              resolve(false);
            });

            child.on("spawn", () => {
              child.unref();

              setTimeout(() => {
                fetch("http://127.0.0.1:8080/health", { signal: AbortSignal.timeout(2000) })
                  .then((response) => {
                    this.touchLocalLLM();
                    resolve(response.status === 200 && response.ok);
                  })
                  .catch(() => {
                    resolve(false);
                  });
              }, 3000);
            });
          });
        }
      });
  }

  private touchLocalLLM(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.stopLocalLLM(), OpenCodeService.IDLE_TIMEOUT_MS);
    this.idleTimer.unref();
  }

  private stopLocalLLM(): void {
    const pid = spawnSync("/usr/sbin/lsof", ["-ti", "tcp:8080"], {
      encoding: "utf-8",
    }).stdout.trim();
    if (pid) spawnSync("/bin/kill", ["-TERM", pid]);
  }

  private isPortBusy(port: number): boolean {
    return spawnSync("/usr/sbin/lsof", ["-ti", `tcp:${port}`], { stdio: "ignore" }).status === 0;
  }

  async opencodeLLM(prompt: string) {
    const model = [
      "opencode/deepseek-v4-flash-free",
      "opencode/ling-3.0-flash-free",
      "opencode/north-mini-code-free",
      "opencode/laguna-s-2.1-free",
      "opencode/big-pickle",
    ];
    const currentModel = model[this.modelOpencodeVariant];

    const escaped = prompt
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "")
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");

    const cmd = `opencode run "${escaped}" -m ${currentModel} --format json --auto`;

    try {
      const exec = execSync(cmd, {
        encoding: "utf-8",
        timeout: 120_000,
      });

      const lines = exec.trim().split("\n");

      let result: string = "";

      for (const line of lines) {
        const event = JSON.parse(line);

        if (event.type === "text" && event.part?.text) {
          result = event.part.text;
        }
      }

      return result;
    } catch (err) {
      this.modelOpencodeVariant =
        this.modelOpencodeVariant === model.length - 1 ? 0 : this.modelOpencodeVariant + 1;
      throw `Ошибка запроса к opencode: ${err}`;
    }
  }
}
