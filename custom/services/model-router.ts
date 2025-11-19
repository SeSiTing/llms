import type { ModelRouteRule } from "../types/config.types.js";
import { DEFAULT_ROUTE_RULES } from "../constants/server.constants.js";

/**
 * 模型路由器
 * 
 * 负责将原始模型名称转换为目标模型名称（格式: provider,model）
 */
export class ModelRouter {
  private rules: ModelRouteRule[];

  constructor(customRules?: ModelRouteRule[]) {
    // 合并自定义规则和默认规则，自定义规则优先级更高
    this.rules = customRules 
      ? [...customRules, ...DEFAULT_ROUTE_RULES] 
      : [...DEFAULT_ROUTE_RULES];
  }

  /**
   * 路由模型名称
   * 
   * @param modelName 原始模型名称
   * @param defaultProvider 默认 provider 名称（如果规则中没有指定 provider）
   * @returns 路由结果对象，包含路由后的模型名称和匹配的规则描述；如果无法匹配则返回 null
   */
  routeModel(modelName: string, defaultProvider?: string): { model: string; ruleDescription?: string } | null {
    if (!modelName || typeof modelName !== "string") {
      return null;
    }

    const lowerModel = modelName.toLowerCase();

    // 遍历所有规则，找到第一个匹配的
    for (const rule of this.rules) {
      try {
        const regex = new RegExp(rule.pattern, "i"); // 不区分大小写
        const match = lowerModel.match(regex);

        if (match) {
          // 构建目标模型名称
          let targetModel = rule.targetModel;

          // 替换占位符
          // $0 表示整个匹配的字符串（使用原始大小写）
          // 特殊处理：如果 $0 是唯一的占位符且匹配结果只是前缀，则使用整个原始模型名称
          // $1, $2, ... 表示捕获组（使用原始大小写）
          if (targetModel.includes("$")) {
            // 在原始模型名称上匹配，以保留大小写
            const originalMatch = modelName.match(new RegExp(rule.pattern, "i"));
            if (originalMatch) {
              // 特殊处理：如果 targetModel 只是 $0 且匹配结果只是前缀，使用整个原始模型名称
              if (targetModel.trim() === "$0" && originalMatch[0].length < modelName.length) {
                targetModel = modelName;
              } else {
                // 替换 $0（使用原始大小写的匹配结果）
                targetModel = targetModel.replace(/\$0/g, originalMatch[0]);
                // 替换 $1, $2, ... (捕获组，使用原始大小写)
                for (let i = 1; i < originalMatch.length; i++) {
                  const placeholder = `$${i}`;
                  if (targetModel.includes(placeholder)) {
                    targetModel = targetModel.replace(
                      new RegExp(`\\${placeholder}`, "g"),
                      originalMatch[i] || ""
                    );
                  }
                }
              }
            } else {
              // 如果原始匹配失败，使用小写版本（降级处理）
              if (targetModel.trim() === "$0" && match[0].length < modelName.length) {
                targetModel = modelName;
              } else {
                targetModel = targetModel.replace(/\$0/g, match[0]);
                for (let i = 1; i < match.length; i++) {
                  const placeholder = `$${i}`;
                  if (targetModel.includes(placeholder)) {
                    targetModel = targetModel.replace(
                      new RegExp(`\\${placeholder}`, "g"),
                      match[i] || ""
                    );
                  }
                }
              }
            }
          }

          // 确定使用的 provider
          const provider = rule.provider || defaultProvider;

          if (!provider) {
            // 如果没有 provider，无法路由
            continue;
          }

          // 返回格式: provider,model
          return {
            model: `${provider},${targetModel}`,
            ruleDescription: rule.description,
          };
        }
      } catch (error) {
        // 如果正则表达式无效，跳过该规则
        console.warn(`Invalid regex pattern in route rule: ${rule.pattern}`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * 获取所有路由规则（用于调试）
   */
  getRules(): ModelRouteRule[] {
    return [...this.rules];
  }
}

