# 技術建議與注意事項 (Technical Advice & Notes)

這份文件記錄了專案開發過程中遇到的重要技術問題、建議與部署注意事項，避免重複踩坑。

## 構建與部署 (Build & Deployment)

### 1. Vercel 部署失敗：TypeScript 類型檢查錯誤 (Vitest 相關)
**問題描述**：
在專案中加入 Vitest 測試後，Vercel 部署時 `npm run build` 會因為 TypeScript 嘗試對測試相關檔案（如 `vitest.config.ts` 或 `*.test.ts`）進行嚴格的類型檢查，導致因第三方套件類型解析問題（如 `vitest-tsconfig-paths`）而編譯失敗。

**解決方案**：
在 `tsconfig.json` 的 `exclude` 陣列中明確排除測試檔案與配置檔案，確保 Next.js 生產環境編譯時不會檢查這些檔案：
```json
"exclude": ["node_modules", "**/*.test.ts", "vitest.config.ts", "vitest.setup.ts"]
```
同時在 `vitest.config.ts` 中對難以解析類型的第三方套件使用 `// @ts-ignore`。

**紀錄日期**：2026-03-18

---
