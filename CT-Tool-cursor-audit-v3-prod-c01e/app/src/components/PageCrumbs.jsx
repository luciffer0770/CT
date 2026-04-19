/** Breadcrumb row: workspace / line label / page title */
export default function PageCrumbs({ line, pageTitle }) {
  const lab = line?.trim() || "LINE";
  return (
    <div className="crumbs">
      WORKSPACE <span className="sep">/</span> {lab} <span className="sep">/</span> {pageTitle}
    </div>
  );
}
