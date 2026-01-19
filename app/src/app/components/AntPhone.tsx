//Author:
//Jonty Hourn: Functioality and basic UI
//Ian Cuchapin: UI Changes
//Description: AntPhone component for phone number input with country selector
import { Button, Input, InputRef, Space} from 'antd';
import React, { useEffect, useRef } from 'react';

import { CountrySelector, usePhoneInput } from 'react-international-phone';
import "react-international-phone/style.css";




interface AntPhoneProps {
  value: string;
  onChange: (phone: string) => void;
  inputStyle?: React.CSSProperties;
}

export const AntPhone: React.FC<AntPhoneProps> = ({ value, onChange, inputStyle }) => {
  const phoneInput = usePhoneInput({
    defaultCountry: 'au',
    value,
    onChange: (data) => {
      onChange(data.phone);
    },
  });

  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (phoneInput.inputRef && inputRef.current?.input) {
      phoneInput.inputRef.current = inputRef.current.input;
    }
  }, [inputRef, phoneInput.inputRef]);

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Space.Compact>
        
        
      </Space.Compact>
      <Space.Compact block>
      <CountrySelector
          selectedCountry={phoneInput.country.iso2}
          onSelect={(country) => phoneInput.setCountry(country.iso2)}
          renderButtonWrapper={({ children, rootProps }) => (
            <Button
              {...rootProps}
              style={{
                padding: '4px',
                height: '100%',
                zIndex: 1,
              }}
            >
              {children}
            </Button>
          )}
          dropdownStyleProps={{
            style: {
              top: '35px',
            },
          }}
        />
      <Input
          placeholder="Phone number"
          type="tel"
          value={phoneInput.inputValue}
          onChange={phoneInput.handlePhoneValueChange}
          ref={inputRef}
          name="phone"
          autoComplete="tel"
          style={inputStyle}
        />
    </Space.Compact>
    </div>
  );
};