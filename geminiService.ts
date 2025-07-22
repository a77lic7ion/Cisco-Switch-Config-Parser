

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedConfigData, AnalysisFinding, VendorName } from '../types';
import { GEMINI_TEXT_MODEL } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY is not set. Gemini API calls will fail. Ensure process.env.API_KEY is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const sanitizeAndParseJson = (jsonString: string): any => {
  let cleanJsonString = jsonString.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanJsonString.match(fenceRegex);
  if (match && match[2]) {
    cleanJsonString = match[2].trim();
  }
  try {
    return JSON.parse(cleanJsonString);
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Raw string:", jsonString);
    throw new Error(`Failed to parse AI response as JSON. Content: ${jsonString.substring(0,1000)}`);
  }
};


export const parseConfigurationWithGemini = async (
  configText: string,
  vendor: VendorName
): Promise<ParsedConfigData> => {
  if (!API_KEY) throw new Error("API_KEY is not configured.");

  const prompt = `
You are an expert network configuration parsing assistant.
Parse the following ${vendor} configuration text.
Extract structured data for the following categories:
- Device Information: Hostname (hostname), OS version (os_version), model, serial number (serial_number), uptime.
- Interfaces: Name (name), IP addresses (ip_address), subnet masks (subnet_mask), descriptions (description), status, speed/duplex, port-channels.
- VLANs & SVIs: VLAN IDs (vlan_id), names (name), SVI IP addresses (svi_ip_address), helper addresses, network ranges, free IPs.
- Routing Protocols: Protocol type, configurations, static routes, default gateways.
- Security Features: AAA, SSH, SNMP, password encryption, ACLs, firewall rules.
- Other Services: NTP, DNS, VTP, CDP/LLDP.

Respond ONLY with a JSON object. The root object should contain keys: "deviceInfo", "interfaces" (array), "vlansSvis" (array), "routingProtocols" (array), "securityFeatures" (array), "otherServices" (array).
Ensure all keys are camelCase. For example, use "osVersion" instead of "os_version".
If a category is not present or data is not found, you can return an empty object for deviceInfo or an empty array for list-based categories.

Configuration Text:
---
${configText}
---
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Lower temperature for more deterministic parsing
      },
    });
    
    const parsedJson = sanitizeAndParseJson(response.text);
    return parsedJson as ParsedConfigData;

  } catch (error) {
    console.error("Error parsing configuration with Gemini:", error);
    throw error;
  }
};

export const analyzeConfigurations = async (
  configs: ParsedConfigData[]
): Promise<AnalysisFinding[]> => {
  if (!API_KEY) throw new Error("API_KEY is not configured.");
  if (configs.length < 1) return [];

  const simplifiedConfigs = configs.map(c => ({
    fileName: c.fileName,
    vendor: c.vendor,
    hostname: c.hostname || c.deviceInfo?.hostname,
    interfaces: (c.interfaces || c.svis)?.map(i => ({ 
        name: i.name || i.svi, 
        ip_address: i.ipAddress, 
        description: i.description,
        status: i.status
    })).slice(0, 20),
    vlans: (c.vlansSvis || c.vlans)?.map(v => ({ 
        id: v.vlan_id || v.id, 
        name: v.name 
    })).slice(0, 20),
    security: c.security, // Pass security compliance data
  }));

  const prompt = `
You are an expert Network Configuration Auditor.
Analyze the following JSON array of parsed device configurations.
Identify conflicts, security risks, and deviations from industry best practices.

For each finding, provide:
1. A unique 'id' string (e.g., "sec_risk_1").
2. A 'type': "Conflict", "Security Risk", "Suggestion", or "Best Practice".
3. A 'severity': "Critical", "High", "Medium", "Low", or "Info".
4. A concise 'description' of the finding.
5. The 'devicesInvolved' (an array of fileNames or hostnames).
6. The 'details' (an object or string with specific data related to the finding).
7. A clear 'recommendation' for how to fix or improve the configuration.

Focus on these areas:
- Conflicts: Overlapping IP subnets, duplicate hostnames, mismatched VLAN names for the same ID across devices.
- Security Risks: Missing 'service password-encryption', HTTP server enabled (no 'no ip http server'), insecure SNMP configurations, lack of AAA, missing port-security on access ports, no BPDU guard on edge ports.
- Best Practices & Suggestions: Missing descriptions on interfaces/VLANs, inconsistent naming schemes across devices (e.g., "VLAN10_USERS" vs "vlan10-users"), enabling CDP/LLDP, setting a VTP mode to transparent or off, unused configurations.

Respond ONLY with a JSON array of finding objects following the specified structure. The root of the response must be a valid JSON array.
If no issues are found, return an empty JSON array [].

Configurations:
---
${JSON.stringify(simplifiedConfigs, null, 2)}
---
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, 
      },
    });

    const parsedJson = sanitizeAndParseJson(response.text);
    
    if (Array.isArray(parsedJson)) {
      return parsedJson.map((item, index) => ({
        ...item,
        id: item.id || `finding_${Date.now()}_${index}`,
      })) as AnalysisFinding[];
    }
    return [] as AnalysisFinding[];

  } catch (error) {
    console.error("Error analyzing configurations with Gemini:", error);
    throw error;
  }
};