# 그래프용 픽셀 글꼴

- [Silkscreen Regular 원본](https://github.com/google/fonts/tree/main/ofl/silkscreen)을 사용합니다.
- 라이선스는 [SIL Open Font License 1.1](OFL-Silkscreen.txt)입니다. 프로젝트의 MIT 라이선스와 별도로 원본 글꼴의 라이선스를 보존합니다.
- `silkscreen-glyphs.json`은 FontTools의 SVGPathPen으로 원본 TTF에서 추출한 ASCII 및 가운데점의 윤곽과 advance 값입니다. 글꼴 자체를 새로 디자인하지 않았습니다.
- `workers-chart-pixel-text.ts`가 이 윤곽을 SVG 경로로 그립니다. 실행 컴퓨터에 글꼴을 설치하거나 온라인에서 가져올 필요가 없습니다.
- 글자 크기는 원본 8칸 격자의 정수 배수로 사용하고, 완성된 그래프를 다시 축소하지 않아 픽셀 모양이 흐려지지 않도록 합니다.
