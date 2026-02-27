# P2P 借貸媒合平台 - 產品需求文檔 (PRD)

| 屬性 | 內容 |
| :--- | :--- |
| **專案名稱** | P2P Lending Platform |
| **版本** | v1.0.0 (MVP) |
| **狀態** | Draft (草稿) |
| **最後更新** | 2023-10-27 |
| **負責人** | Product Team |

---

## 1. 專案概述 (Overview)

### 1.1 背景
本專案旨在建立一個去中心化或點對點 (Peer-to-Peer) 的金融借貸媒合平台。解決傳統金融機構審核流程冗長、資訊不透明的問題，同時為投資人提供更多元的資金配置管道。

### 1.2 核心目標 (Objectives)
1.  **媒合效率**：建立自動化媒合引擎，將資金供需雙方的匹配時間縮短至分鐘級。
2.  **安全性**：確保 KYC/AML 合規，並保證資金流轉的原子性 (Atomicity) 與一致性。
3.  **可擴展性**：系統架構需支援高併發交易 (High Concurrency)，為未來流量增長做準備。

---

## 2. 用戶角色 (User Personas)

| 角色 | 權限與功能 | 痛點解決 |
| :--- | :--- | :--- |
| **借款人 (Borrower)** | 註冊、KYC、發布借款需求、還款、查看額度。 | 快速獲得資金，無需繁瑣臨櫃手續。 |
| **投資人 (Lender)** | 註冊、KYC、充值、瀏覽標的、投標(手動/自動)、提現。 | 獲得比傳統儲蓄更高的收益，投資門檻低。 |
| **管理員 (Admin)** | 用戶管理、風控審核(人工介入)、資金對帳、系統參數設定。 | 集中化管理平台風險與運營數據。 |

---

## 3. 功能需求 (Functional Requirements)

### 3.1 帳戶與安全 (Account & Security)
*   **註冊/登入**：支援 Email 與手機號碼 (OTP 驗證)。
*   **身份認證 (eKYC)**：
    *   整合 OCR 掃描證件。
    *   活體檢測 (Liveness Check)。
    *   風險名單過濾 (AML Screening)。

### 3.2 交易核心 (Core Transaction)
*   **借款申請**：
    *   輸入：金額、期數 (3/6/12/24 期)、用途。
    *   輸出：系統預審利率與額度。
*   **投資媒合**：
    *   **散標列表**：投資人可瀏覽詳細標的資訊（去識別化）。
    *   **自動投標**：投資人設定策略（如：僅投 A 級風險、期限 < 12 個月），系統自動匹配。
*   **訂單狀態機**：嚴格定義訂單流轉狀態 (Draft -> Review -> Bidding -> Full -> Repaying -> Done)。

### 3.3 資金結算 (Settlement)
*   **虛擬帳戶**：為每個用戶建立獨立的資金帳戶 (Ledger)。
*   **還款計畫**：支援「等額本息」與「先息後本」算法。
*   **逾期處理**：自動計算罰息 (Late Fee)，並標記信用狀態。

---

## 4. 技術規格與數據模型 (Technical Specifications)

### 4.1 核心數據結構 (TypeScript Interface)

建議後端與前端共用以下 Type 定義，以確保資料一致性。

```typescript
// 借款單狀態枚舉
export enum LoanStatus {
  PENDING_REVIEW = 'PENDING_REVIEW', // 待審核
  BIDDING = 'BIDDING',               // 募資中
  FULLY_FUNDED = 'FULLY_FUNDED',     // 滿標待放款
  REPAYING = 'REPAYING',             // 還款中
  COMPLETED = 'COMPLETED',           // 已結清
  DEFAULTED = 'DEFAULTED',           // 違約
}

// 借款申請單模型
export interface LoanApplication {
  id: string;
  borrowerId: string;
  amount: number;           // 單位：分 (cents)，避免浮點數誤差
  currency: string;         // e.g., 'TWD', 'USD'
  termMonths: number;       // 期數
  interestRateBps: number;  // 年化利率 (Basis Points, e.g., 500 = 5%)
  status: LoanStatus;
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  createdAt: Date;
  fundedAmount: number;     // 當前已募金額
}

// 投資紀錄模型
export interface Investment {
  id: string;
  loanId: string;
  investorId: string;
  amount: number;
  status: 'RESERVED' | 'CONFIRMED' | 'CANCELLED'; // 資金凍結狀態
  createdAt: Date;
}
