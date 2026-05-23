import { NextResponse } from 'next/server';
import { validateRequestBody, isValidEmail } from '../../lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Example: Validate user registration
    const validation = validateRequestBody(
      body,
      ['email', 'password', 'name'], // required fields
      [
        {
          field: 'email',
          type: 'email',
          required: true
        },
        {
          field: 'password',
          type: 'string',
          required: true,
          minLength: 8
        },
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 100
        },
        {
          field: 'age',
          type: 'number',
          required: false,
          custom: (value) => {
            if (value < 18) return 'Must be 18 or older';
            if (value > 120) return 'Age seems unrealistic';
            return null;
          }
        }
      ]
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors },
        { status: 400 }
      );
    }

    // Use validated data
    const { email, password, name, age } = validation.data;

    // TODO: Process registration
    console.log('Validated user data:', { email, name, age });

    return NextResponse.json({
      success: true,
      message: 'Validation passed!',
      data: { email, name, age }
    });

  } catch (error) {
    console.error('Validation test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}