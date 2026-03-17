import { NextRequest, NextResponse } from 'next/server';
import { supabaseInsert, supabaseQuery } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, company, phone, country, timezone, industry,
            company_size_band, tech_comfort_level } = body;
    
    if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 });

    // Upsert customer
    const result = await supabaseInsert(`
      INSERT INTO public.wf_customers (email, name, company, phone, country, timezone,
        industry, company_size_band, tech_comfort_level, onboarding_status)
      VALUES (
        '${email.replace(/'/g,"''")}',
        '${name.replace(/'/g,"''")}',
        ${company ? `'${company.replace(/'/g,"''")}'` : 'null'},
        ${phone ? `'${phone.replace(/'/g,"''")}'` : 'null'},
        ${country ? `'${country.replace(/'/g,"''")}'` : "'AU'"},
        ${timezone ? `'${timezone}'` : "'Australia/Sydney'"},
        ${industry ? `'${industry.replace(/'/g,"''")}'` : 'null'},
        ${company_size_band ? `'${company_size_band}'` : 'null'},
        ${tech_comfort_level ? `'${tech_comfort_level}'` : "'basic'"},
        'active'
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        company = COALESCE(EXCLUDED.company, wf_customers.company),
        updated_at = now()
      RETURNING customer_id, email, name
    `);
    
    const customers = await supabaseQuery<{customer_id: string; email: string}>(
      `SELECT customer_id, email, name FROM public.wf_customers WHERE email = '${email.replace(/'/g,"''")}'`
    );
    return NextResponse.json({ customer: customers[0] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
