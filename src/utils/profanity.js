const Thaiword = [

    "เหี้ย", "ไอ้เหี้ย", "อีเหี้ย", "ไอเหี้ย", "อีเหี้ย",
    "สัตว์", "ไอ้สัตว์", "อีสัตว์", "ไอสัส", "อีสัส", "สัส", "สาส", "อีสาส", "ไอสัส",
    "ควาย", "ไอ้ควาย", "อีควาย", "ไอควาย",
    "หน้าหี", "หี", "แตด", "ไอหน้าหี",
    "เย็ด", "เย็ดแม่", "อีช้างเย็ด", "แม่เย็ด",
    "ควย", "หน้าควย", "หัวควย", "ไอควย",
    "สันดาน", "ระยำ", "จัญไร", "ปัญญาอ่อน", "ปันยาอ่อน",
    "ไอบ้า", "อีบ้า", "ไอ้บ้า",
    "ไอ้เวร", "อีเวร", "ไอเวร",
    "แม่ง",
    "อีดอก", "ไอดอก", "ดอกทอง",
    "ห่า", "อีห่า",
    "เชี่ย", "ไอเชี่ย", "อีเชี่ย",
    "หน้าส้นตีน", "ส้นตีน", "ส้นตีนแม่ง",
    "กะหรี่", "ลูกกะหรี่", "ลูกกระหรี่", "กระหรี่",
];

// Replace Bad Thai word into ***
function filterProfanity(text) {
    if (!text || typeof text !== "string") return text;

    let filtered = text;
    for (const word of Thaiword) {
        const regex = new RegExp(word, "gi");
        filtered = filtered.replace(regex, "***");
    }
    return filtered;
}

// Filter fields in object
function filterObjectProfanity(obj, fields = []) {
    if (!obj) return obj;

    const filtered = { ...obj };
    for (const field of fields) {
        if (filtered[field] && typeof filtered[field] === "string") {
            filtered[field] = filterProfanity(filtered[field]);
        }
    }
    return filtered;
}

module.exports = { filterProfanity, filterObjectProfanity, Thaiword };
