import { describe, it, expect } from "vitest";
import { formatMissingFieldsMessage } from "@/lib/template-input-fields";

describe("formatMissingFieldsMessage", () => {
  it("不足している項目を名指しする", () => {
    expect(formatMissingFieldsMessage(["familyMembers"])).toBe("「だれと一緒だった？」を入力してください");
  });
  it("複数は「と」でつなぐ", () => {
    expect(formatMissingFieldsMessage(["place", "familyMembers"])).toBe(
      "「どこでの思い出？」と「だれと一緒だった？」を入力してください"
    );
  });
  it("未知の項目名はそのまま出す / 空なら空文字", () => {
    expect(formatMissingFieldsMessage(["foo"])).toBe("「foo」を入力してください");
    expect(formatMissingFieldsMessage([])).toBe("");
  });
});
