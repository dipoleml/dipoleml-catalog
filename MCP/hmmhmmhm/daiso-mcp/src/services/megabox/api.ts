/**
 * 메가박스 API 엔드포인트 중앙 관리
 */

export const MEGABOX_API = {
  BASE_URL: 'https://www.megabox.co.kr',
  SELECT_BOOKING_LIST_PATH: '/on/oh/ohb/SimpleBooking/selectBokdList.do',
  THEATER_INFO_PATH: '/on/oh/ohc/Brch/infoPage.do',
} as const;
