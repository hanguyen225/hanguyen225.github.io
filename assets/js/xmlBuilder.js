import { escapeXml } from "./utils.js";

export function buildTransformedXml(rows) {
  const rowsXml = rows
    .map((row, rowIndex) => {
      return `    <THONG_TIN_KHACH>
        <so_thu_tu>${rowIndex + 1}</so_thu_tu>
        <ho_ten>${escapeXml(row.name ?? "")}</ho_ten>
        <ngay_sinh>${escapeXml(row.dob ?? "")}</ngay_sinh>
        <ngay_sinh_dung_den>${escapeXml(row.birthdateCorrectUpTo ?? "")}</ngay_sinh_dung_den>
        <gioi_tinh>${escapeXml(row.gender ?? "")}</gioi_tinh>
        <ma_quoc_tich>${escapeXml(row.nationalityCode ?? "")}</ma_quoc_tich>
        <so_ho_chieu>${escapeXml(row.passportNumber ?? "")}</so_ho_chieu>
        <so_phong>${escapeXml(row.roomNumber ?? "")}</so_phong>
        <ngay_den>${escapeXml(row.arrivalDate ?? "")}</ngay_den>
        <ngay_di_du_kien>${escapeXml(row.expectedLeavingDate ?? "")}</ngay_di_du_kien>
        <ngay_tra_phong>${escapeXml(row.checkoutDate ?? "")}</ngay_tra_phong>
    </THONG_TIN_KHACH>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<KHAI_BAO_TAM_TRU>
${rowsXml || "    <!-- no rows -->"}
</KHAI_BAO_TAM_TRU>
`;
}
