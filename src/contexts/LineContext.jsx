import React, { createContext, useContext, useState, useEffect } from 'react';
import liff from '@line/liff';
import { buildLineLoginRedirectUri } from '../utils/lineAuth';

const LineContext = createContext();

// TODO: ใส่ LIFF ID ของคุณที่ได้จาก LINE Developers Console
const LIFF_ID = "2009072641-zLc7rR4L";

export function LineProvider({ children }) {
  const [liffObject, setLiffObject] = useState(null);
  const [lineProfile, setLineProfile] = useState(null);
  const [liffError, setLiffError] = useState(null);

  useEffect(() => {
    const initLiff = async () => {
      if (LIFF_ID === "YOUR_LIFF_ID_HERE" || !LIFF_ID) {
        console.warn("⚠️ ยังไม่ได้ใส่ LIFF ID");
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        setLiffObject(liff);

        // ✅ เช็คทันทีว่า Login ค้างไว้ไหม ถ้าค้างให้ดึงข้อมูลเลย (ไม่ต้อง Alert)
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile(profile);
          console.log("✅ Auto-detected LINE Session:", profile.displayName);
        }
      } catch (error) {
        console.error("LIFF Init Failed:", error);
        setLiffError(error.toString());
      }
    };

    initLiff();
  }, []);

  const loginLine = () => {
    if (!liffObject) return;

    // ✅ แก้ไข: ไม่ต้อง Alert ว่าเข้าสู่ระบบแล้ว แต่ให้เช็ค Profile เลย
    if (!liffObject.isLoggedIn()) {
      const redirectUri = buildLineLoginRedirectUri();
      liffObject.login(redirectUri ? { redirectUri } : undefined); 
    } else {
      // ถ้า Login อยู่แล้ว ให้ Refresh Profile อีกรอบเพื่อความชัวร์
      liffObject.getProfile().then(profile => {
        setLineProfile(profile);
      });
    }
  };

  const logoutLine = () => {
    if (liffObject && liffObject.isLoggedIn()) {
      liffObject.logout(); // ✅ สั่ง Logout ออกจาก Server LINE
      setLineProfile(null); // เคลียร์ค่าในแอพ
    }
  };

  return (
    <LineContext.Provider value={{ liffObject, lineProfile, liffError, loginLine, logoutLine }}>
      {children}
    </LineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLine() {
  return useContext(LineContext);
}
