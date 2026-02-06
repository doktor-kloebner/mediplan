/** Realistic UKF XML test fixtures. */

export const SIMPLE_BMP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="11111111111111111111111111111111" l="de">
  <P g="Max" f="Mustermann" egk="A123456789" b="19550315" s="M"/>
  <A n="Dr. med. Erika Musterärztin" lanr="123456789" s="Musterstr. 1" z="12345" c="Musterstadt" p="030-1234567" e="praxis@example.de" t="20240115120000"/>
  <O ai="Penicillin" w="80" h="178" c="1.2"/>
  <S c="411">
    <M p="12345678" a="Metoprolol 47,5mg" f="FTA" m="1" d="0" v="0" h="0" e="Stk">
      <W w="Metoprololsuccinat" s="47,5 mg"/>
    </M>
    <M p="87654321" a="Ramipril 5mg" f="TAB" m="1" d="0" v="1" h="0" e="Stk" r="Bluthochdruck">
      <W w="Ramipril" s="5 mg"/>
    </M>
  </S>
  <S c="412">
    <M a="Ibuprofen 400mg" f="FTA" du="bei Bedarf, max. 3x täglich" e="Stk" r="Schmerzen">
      <W w="Ibuprofen" s="400 mg"/>
    </M>
  </S>
</MP>`;

export const MINIMAL_BMP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="22222222222222222222222222222222" l="de">
  <P g="Anna" f="Schmidt"/>
  <A n="Praxis Dr. Müller"/>
  <S c="411">
    <M a="Aspirin 100mg">
      <W w="Acetylsalicylsäure" s="100 mg"/>
    </M>
  </S>
</MP>`;

export const FREE_TEXT_SECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="33333333333333333333333333333333" l="de">
  <P g="Peter" f="Meyer"/>
  <A n="Dr. Schmidt"/>
  <S t="Hinweise zur Einnahme">
    <X t="Alle Medikamente mit ausreichend Wasser einnehmen."/>
    <R t="Rezept für Physiotherapie bitte erneuern"/>
  </S>
</MP>`;

export const MULTI_INGREDIENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="44444444444444444444444444444444" l="de">
  <P g="Klaus" f="Weber"/>
  <A n="Dr. Fischer"/>
  <S c="411">
    <M a="Kombipräparat" f="FTA" m="1" d="0" v="0" h="0">
      <W w="Amlodipin" s="5 mg"/>
      <W w="Valsartan" s="160 mg"/>
      <W w="Hydrochlorothiazid" s="12,5 mg"/>
    </M>
  </S>
</MP>`;

export const PAGE_1_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="55555555555555555555555555555555" l="de">
  <P g="Maria" f="Bauer"/>
  <A n="Dr. Schulz"/>
  <S c="411">
    <M a="Medikament A">
      <W w="Wirkstoff A"/>
    </M>
  </S>
</MP>`;

export const PAGE_2_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="55555555555555555555555555555555" l="de">
  <P g="Maria" f="Bauer"/>
  <A n="Dr. Schulz"/>
  <S c="412">
    <M a="Medikament B">
      <W w="Wirkstoff B"/>
    </M>
  </S>
</MP>`;

export const OBSERVATIONS_FULL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="66666666666666666666666666666666" l="de">
  <P g="Lisa" f="Klein" s="W"/>
  <A n="Dr. Braun"/>
  <O ai="Sulfonamide, Latex" w="65" h="165" c="0.9" p="1" b="0"/>
  <S c="411">
    <M a="Folsäure 5mg" m="1" d="0" v="0" h="0">
      <W w="Folsäure" s="5 mg"/>
    </M>
  </S>
</MP>`;
