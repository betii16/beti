import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { amount, method, bookingId } = await req.json()

    if (!amount || !method || !bookingId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Génération d'une référence unique
    const ref = `BETI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    return NextResponse.json({
      success: true,
      refNumber: ref,
      amount,
      method,
      bookingId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
