import { NextResponse } from 'next/server';

const BRIDGE = 'https://m5oqj21chd.execute-api.ap-southeast-2.amazonaws.com/lambda/invoke';

async function bridgeSQL(sql: string) {
  const res = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'troy-sql-executor', sql }),
  });
  return res.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const tier = searchParams.get('tier');
  const search = searchParams.get('q');
  const checkoutOnly = searchParams.get('checkout') === 'true';

  try {
    if (checkoutOnly) {
      const r = await bridgeSQL(`SELECT * FROM v_catalog_checkout WHERE is_active=true ORDER BY price_aud`);
      return NextResponse.json({ success: true, products: r.rows || [] });
    }

    let where = `WHERE is_active=true`;
    if (category) where += ` AND category='${category.replace(/'/g, "''")}'`;
    if (tier) where += ` AND tier='${tier.replace(/'/g, "''")}'`;
    if (search) where += ` AND (name ILIKE '%${search.replace(/'/g, "''")}%' OR description ILIKE '%${search.replace(/'/g, "''")}%' OR category ILIKE '%${search.replace(/'/g, "''")}%')`;

    const products = await bridgeSQL(`SELECT id, name, category, tier, base_price, description, delivery_method, target_audience, customer_outcome, engagement_model, tags, stripe_product_id, stripe_price_id FROM v_master_product_catalog ${where} ORDER BY category, base_price LIMIT 100`);

    const categories = await bridgeSQL(`SELECT category, COUNT(*) as cnt, MIN(base_price) as min_price, MAX(base_price) as max_price FROM v_master_product_catalog WHERE is_active=true GROUP BY category ORDER BY cnt DESC`);

    return NextResponse.json({
      success: true,
      products: products.rows || [],
      categories: categories.rows || [],
      total: (products.rows || []).length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
