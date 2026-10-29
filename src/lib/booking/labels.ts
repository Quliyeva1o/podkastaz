/** Admin names and badge colours of booking statuses. */
export const statusLabels: Record<string, string> = {
  new: "Yeni",
  confirmed: "Təsdiqləndi",
  rejected: "Rədd edildi",
  cancelled: "Ləğv edildi",
  completed: "Tamamlandı",
  blocked: "Bağlı vaxt",
};

export const statusBadge: Record<string, string> = {
  new: "bg-[#fff1e6] text-[#cc4002]",
  confirmed: "bg-[#e6f6ec] text-[#1f7a43]",
  rejected: "bg-[#fdecec] text-[#c4373c]",
  cancelled: "bg-[#f1f0ef] text-[#6e6a67]",
  completed: "bg-[#e8eefc] text-[#3756a8]",
  blocked: "bg-[#292726] text-white",
};

/** Calendar colours, one per studio in admin order. */
export const studioColors = ["#fe5b00", "#3756a8", "#1f7a43", "#a1320b", "#7c3aed", "#0e7490"];
