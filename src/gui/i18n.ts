/** The plugin's copy. English fills any key a locale lacks. */

export const en = {
  "command.open": "Open usage",
  "command.open.description": "OpenCode Go usage and plan limits",
  "toast.noSession": "Open a session first, then run this again.",

  "panel.title": "Usage",
  "panel.loading": "Reading OpenCode Go usage…",
  "panel.empty": "No usage in this range yet.",
  "panel.error": "Could not read usage: {{message}}",
  "panel.refresh": "Refresh",
  "panel.source":
    "Usage and limits are read from the OpenCode Console for the selected account.",

  "range.today": "Today",
  "range.7d": "7d",
  "range.30d": "30d",
  "range.month": "Month",
  "range.all": "Plan",

  "total.tokens": "Tokens",
  "total.requests": "Requests",
  "total.cost": "Cost",
  "row.models": "Models",

  "card.limits": "Limits",
  "card.limits.sub": "OpenCode Go plan",
  "card.totals": "Totals",
  "card.totals.sub": "This window",
  "card.models": "Models",
  "card.models.sub": "By requests, whole plan period",

  "limits.rolling": "Rolling 5h",
  "limits.weekly": "Weekly",
  "limits.monthly": "Monthly",
  "limits.account": "Account",
  "limits.account.console": "Console",
  "limits.account.key": "API key",
  "limits.switchError": "Could not switch account: {{message}}",
  "limits.resets": "Resets in {{when}}",
  "limits.resetsNow": "Resets now",
  "limits.left": "{{percent}}% left",
  "limits.loading": "Reading OpenCode Go limits…",
  "limits.unavailable": "OpenCode Go limits are unavailable.",
  "limits.notConnected": "Sign in to OpenCode Go to see this plan's limits.",
  "limits.notSubscribed": "This account has no active OpenCode Go plan.",
  "limits.error": "Could not read OpenCode Go limits: {{message}}",
  "limits.planEnds": "Plan ends in {{when}}",

  "usage.notConnected": "Sign in to the OpenCode Console to see Go usage.",

  "chart.average": "Averaging {{tokens}} a day",
  "chart.usage": "Usage",

  "entry.short.rolling": "5h",
  "entry.short.weekly": "7d",
  "entry.short.monthly": "1mo",
  "entry.title": "OpenCode Go {{window}}: {{percent}}% used",
  "entry.unavailable": "OpenCode Go limits: click for usage",
  "entry.accounts": "OpenCode Go accounts",
  "entry.noAccounts": "No account has an OpenCode Go plan.",

  "settings.title": "Usage",
  "settings.description":
    "OpenCode Go usage and plan limits for OpenCode Desktop, read from the Console. No tools for the model and no auto-update.",
  "settings.section.surfaces": "Surfaces",
  "settings.panel": "Usage tab in the side panel",
  "settings.panel.description":
    "A tab beside each session with the Limits card, ranges, totals and a per-model list. Picking an account in the card switches OpenCode's active credential.",
  "settings.entry": "Limits chip beside the new-tab button",
  "settings.entry.description":
    "A small ring at the end of the tab strip, next to the new-tab button. Rest the pointer on it to see the 5-hour, weekly and monthly share of every account with a Go plan; click it to open the tab.",
  "settings.entryWindow": "Window the chip shows",
  "settings.entryWindow.description":
    "Which limit the ring measures. The hover list always shows all three.",
  "settings.section.defaults": "Defaults",
  "settings.range": "Range the tab opens with",
  "settings.range.description": "You can switch ranges inside the tab at any time.",
  "settings.section.data": "Data",
  "settings.source": "Source",
  "settings.source.description":
    "Usage and limits are read from the OpenCode Console with the credential OpenCode already stores. Nothing is read from this machine, and no secret is logged or copied.",
  "settings.privacy": "Privacy",
  "settings.privacy.description":
    "The only network calls go to OpenCode's Console, for the selected account. Choosing an account asks OpenCode to activate that credential.",
};

export const vi: Record<keyof typeof en, string> = {
  "command.open": "Mở thống kê dùng",
  "command.open.description": "Thống kê và hạn mức OpenCode Go",
  "toast.noSession": "Hãy mở một phiên trước rồi chạy lại.",

  "panel.title": "Sử dụng",
  "panel.loading": "Đang đọc thống kê OpenCode Go…",
  "panel.empty": "Chưa có lượt dùng trong khoảng này.",
  "panel.error": "Không đọc được dữ liệu: {{message}}",
  "panel.refresh": "Làm mới",
  "panel.source":
    "Thống kê và hạn mức đọc từ Console của OpenCode cho tài khoản đang chọn.",

  "range.today": "Hôm nay",
  "range.7d": "7 ngày",
  "range.30d": "30 ngày",
  "range.month": "Tháng",
  "range.all": "Cả kỳ",

  "total.tokens": "Token",
  "total.requests": "Lượt gọi",
  "total.cost": "Chi phí",
  "row.models": "Model",

  "card.limits": "Hạn mức",
  "card.limits.sub": "Gói OpenCode Go",
  "card.totals": "Tổng",
  "card.totals.sub": "Trong khoảng này",
  "card.models": "Model",
  "card.models.sub": "Theo lượt gọi, toàn kỳ gói",

  "limits.rolling": "Cuốn 5 giờ",
  "limits.weekly": "Tuần",
  "limits.monthly": "Tháng",
  "limits.account": "Tài khoản",
  "limits.account.console": "Console",
  "limits.account.key": "API key",
  "limits.switchError": "Không đổi được tài khoản: {{message}}",
  "limits.resets": "Đặt lại sau {{when}}",
  "limits.resetsNow": "Đặt lại ngay",
  "limits.left": "Còn {{percent}}%",
  "limits.loading": "Đang đọc hạn mức OpenCode Go…",
  "limits.unavailable": "Chưa có hạn mức OpenCode Go.",
  "limits.notConnected": "Đăng nhập OpenCode Go để xem hạn mức của gói.",
  "limits.notSubscribed": "Tài khoản này chưa có gói OpenCode Go đang hoạt động.",
  "limits.error": "Không đọc được hạn mức OpenCode Go: {{message}}",
  "limits.planEnds": "Gói kết thúc sau {{when}}",

  "usage.notConnected": "Đăng nhập Console của OpenCode để xem thống kê Go.",

  "chart.average": "Trung bình {{tokens}}/ngày",
  "chart.usage": "Sử dụng",

  "entry.short.rolling": "5 giờ",
  "entry.short.weekly": "7 ngày",
  "entry.short.monthly": "1 tháng",
  "entry.title": "OpenCode Go {{window}}: đã dùng {{percent}}%",
  "entry.unavailable": "Hạn mức OpenCode Go: bấm để xem thống kê",
  "entry.accounts": "Tài khoản OpenCode Go",
  "entry.noAccounts": "Không tài khoản nào có gói OpenCode Go.",

  "settings.title": "Sử dụng",
  "settings.description":
    "Thống kê và hạn mức OpenCode Go cho OpenCode Desktop, đọc từ Console. Không mở tool cho model, không tự cập nhật.",
  "settings.section.surfaces": "Hiển thị",
  "settings.panel": "Tab Sử dụng ở panel bên",
  "settings.panel.description":
    "Một tab cạnh mỗi phiên, có thẻ Hạn mức, khoảng thời gian, tổng và danh sách theo model. Chọn tài khoản trong thẻ sẽ đổi thông tin đăng nhập đang dùng của OpenCode.",
  "settings.entry": "Chip hạn mức cạnh nút tab mới",
  "settings.entry.description":
    "Vòng tròn nhỏ ở cuối dải tab, cạnh nút tab mới. Rê chuột lên để xem tỉ lệ 5 giờ, tuần và tháng của mọi tài khoản có gói Go; bấm để mở tab.",
  "settings.entryWindow": "Cửa sổ chip hiển thị",
  "settings.entryWindow.description":
    "Hạn mức mà vòng tròn đo. Danh sách khi rê chuột luôn hiện cả ba.",
  "settings.section.defaults": "Mặc định",
  "settings.range": "Khoảng thời gian khi mở tab",
  "settings.range.description": "Bạn vẫn đổi được khoảng thời gian ngay trong tab.",
  "settings.section.data": "Dữ liệu",
  "settings.source": "Nguồn dữ liệu",
  "settings.source.description":
    "Thống kê và hạn mức đọc từ Console của OpenCode bằng thông tin đăng nhập OpenCode đã lưu. Không đọc gì trên máy này, không ghi log hay sao chép bí mật.",
  "settings.privacy": "Quyền riêng tư",
  "settings.privacy.description":
    "Các lần gọi mạng chỉ đi tới Console của OpenCode, cho tài khoản đang chọn. Chọn tài khoản sẽ nhờ OpenCode kích hoạt thông tin đăng nhập đó.",
};
