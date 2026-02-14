// components/CertificateTemplate.js
// PDF template with reliable font sources and synchronized alignment
//
// IMPORTANT: This PDF template uses html2canvas + jsPDF approach in verify page
// This component is kept for @react-pdf/renderer but the main PDF download
// now uses html2canvas which perfectly matches the web preview.

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// A4 Landscape dimensions in points
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

// Register fonts with reliable CDN sources (fontsource/unpkg)
// These are more reliable than fonts.gstatic.com which can return 404
try {
  // Great Vibes
  Font.register({
    family: 'Great Vibes',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/great-vibes@latest/latin-400-normal.ttf',
  });

  // Dancing Script
  Font.register({
    family: 'Dancing Script',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Pacifico
  Font.register({
    family: 'Pacifico',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.ttf',
  });

  // Playfair Display
  Font.register({
    family: 'Playfair Display',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Merriweather
  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/merriweather@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/merriweather@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Lora
  Font.register({
    family: 'Lora',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Inter
  Font.register({
    family: 'Inter',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Roboto
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Open Sans
  Font.register({
    family: 'Open Sans',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Poppins
  Font.register({
    family: 'Poppins',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Montserrat
  Font.register({
    family: 'Montserrat',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Oswald
  Font.register({
    family: 'Oswald',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/oswald@latest/latin-400-normal.ttf', fontWeight: 'normal' },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/oswald@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    ],
  });

  // Bebas Neue
  Font.register({
    family: 'Bebas Neue',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.ttf',
  });

  console.log('PDF fonts registered successfully');
} catch (e) {
  console.error('Font registration error:', e);
}

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    top: 0,
    left: 0,
  },
});

// Supported fonts list for fallback
const SUPPORTED_FONTS = [
  'Great Vibes',
  'Dancing Script',
  'Pacifico',
  'Playfair Display',
  'Merriweather',
  'Lora',
  'Inter',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Montserrat',
  'Oswald',
  'Bebas Neue',
];

function getFontFamily(requestedFont) {
  if (SUPPORTED_FONTS.includes(requestedFont)) {
    return requestedFont;
  }
  return 'Helvetica';
}

const CertificateTemplate = ({ elements = [], backgroundImage, backgroundBase64 }) => {
  const bgSrc = backgroundBase64 || backgroundImage;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Background Image */}
        {bgSrc && (
          <Image
            src={bgSrc}
            style={styles.background}
          />
        )}

        {/* Render Elements - using simple percentage-based positioning */}
        {elements.map((el, index) => {
          if (el.visible === false) return null;

          // Get position as percentages (stored as 0-100)
          const xPercent = parseFloat(el.x) || 50;
          const yPercent = parseFloat(el.y) || 50;
          const opacity = (el.opacity || 100) / 100;

          // Text Element - position by CENTER point
          if (el.type === 'text') {
            const fontSize = parseInt(el.fontSize) || 20;
            const text = el.value || '';

            // Calculate center position in points
            const centerX = (xPercent / 100) * PAGE_WIDTH;
            const centerY = (yPercent / 100) * PAGE_HEIGHT;

            // For PDF, we use textAlign center and position at the center point
            // This is more reliable than calculating text width
            return (
              <Text
                key={index}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: centerY - (fontSize / 2),
                  width: PAGE_WIDTH,
                  fontSize: fontSize,
                  fontFamily: getFontFamily(el.fontFamily),
                  fontWeight: el.fontWeight === 'bold' ? 'bold' : 'normal',
                  fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
                  color: el.color || '#000000',
                  letterSpacing: el.letterSpacing || 0,
                  opacity: opacity,
                  textAlign: 'left',
                  paddingLeft: centerX,
                  transform: `translateX(-50%)`,
                }}
              >
                {text}
              </Text>
            );
          }

          // Image Element - use stored dimensions
          if (el.type === 'image' && (el.src || el.srcBase64)) {
            const imgSrc = el.srcBase64 || el.src;
            const width = parseInt(el.width) || 100;
            // Use stored height or calculate from aspect ratio
            const height = el.height ? parseInt(el.height) : width;

            const centerX = (xPercent / 100) * PAGE_WIDTH;
            const centerY = (yPercent / 100) * PAGE_HEIGHT;

            return (
              <Image
                key={index}
                src={imgSrc}
                style={{
                  position: 'absolute',
                  left: centerX - (width / 2),
                  top: centerY - (height / 2),
                  width: width,
                  height: height,
                  opacity: opacity,
                }}
              />
            );
          }

          // QR Code Element
          if (el.type === 'qrcode') {
            const size = parseInt(el.size) || 80;
            const centerX = (xPercent / 100) * PAGE_WIDTH;
            const centerY = (yPercent / 100) * PAGE_HEIGHT;

            if (el.qrDataUrl) {
              return (
                <Image
                  key={index}
                  src={el.qrDataUrl}
                  style={{
                    position: 'absolute',
                    left: centerX - (size / 2),
                    top: centerY - (size / 2),
                    width: size,
                    height: size,
                    objectFit: 'contain',
                    opacity: opacity,
                  }}
                />
              );
            }

            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: centerX - (size / 2),
                  top: centerY - (size / 2),
                  width: size,
                  height: size,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CCCCCC',
                  opacity: opacity,
                }}
              />
            );
          }

          return null;
        })}
      </Page>
    </Document>
  );
};

export default CertificateTemplate;
