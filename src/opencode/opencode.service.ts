import { Injectable } from "@nestjs/common";
import { execSync } from "child_process";

@Injectable()
export class OpenCodeService {
  private readonly baseUrl = "http://localhost:8080/v1/chat/completions";
  private readonly modelName = "gemma-4-E2B_q4_0-it";

  async query2(prompt: string): Promise<string> {
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
        max_tokens: 4096,
        // max_tokens: 2048,
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
        console.error(`LLM запрос завершился с ошибкой: ${error}`);
        throw `Запрос к LLM завершился с ошибкой: ${error}`;
      });
  }

  async query(prompt: string) {
    const model = [
      "deepseek-v4-flash-free",
      "opencode/ling-3.0-flash-free",
      "opencode/north-mini-code-free",
      "opencode/laguna-s-2.1-free",
      "opencode/big-pickle",
    ];
    const currentModel = model[4];
    // const test = 'opencode run "hello" -m opencode/laguna-s-2.1-free --format json';

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
      throw `OpenCode query failed: ${err}`;
    }
  }
}
