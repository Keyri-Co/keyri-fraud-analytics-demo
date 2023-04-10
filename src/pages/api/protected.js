import { verify } from '@/lib/jwt';

export default async function protectedRoute(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = verify(token);
    res.status(200).json({
      message: `Hello, ${decoded.username}! You've successfully authenticated. Please inspect the risk attributes of your authentication below.`,
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
