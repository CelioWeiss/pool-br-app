import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <img src="https://i.postimg.cc/9f4MNdf7/Design-sem-nome-1-removebg-preview-1.png" alt="Favicon" style={{ width: '100%', height: '100%' }} />
      </div>
    ),
    {
      ...size,
    }
  )
}