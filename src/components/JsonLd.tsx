/**
 * Structured data. Search engines use this to understand that a unit page is
 * about a specific named thing with specific numeric properties, which is what
 * makes it eligible for richer results than a plain blue link.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Values are our own generated data, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
