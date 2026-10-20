"""
Dialplan (extensions.conf) Generator
Customized for VoiceLinkPBX Thailand Telecom & International Standards
Handles internal calling, outbound routing, call forwarding, IVR, ring groups, and inbound DID routing
"""
import os
import logging
import subprocess
from typing import List, Optional
from database import InboundRoute, CallForward, VoicemailMailbox, SIPPeer, SIPTrunk, RingGroup, IVRMenu

logger = logging.getLogger(__name__)

EXTENSIONS_CONFIG_PATH = "/etc/asterisk/custom/extensions.conf"


def _build_forward_map(forwards: List[CallForward]) -> dict:
    """Build a dict: extension -> {forward_type: CallForward}"""
    fwd_map: dict = {}
    for fwd in forwards:
        if fwd.extension not in fwd_map:
            fwd_map[fwd.extension] = {}
        fwd_map[fwd.extension][fwd.forward_type] = fwd
    return fwd_map


def _generate_dial_logic(extension: str, fwd_map: dict, ring_time: int = 30, early_answer: bool = False) -> str:
    """Generate dial logic for an extension with call forwarding support.
    Forwards route cleanly through Goto(internal,${destination},1) which supports
    both internal extensions and external mobile/landline numbers without hardcoded trunk names.
    """
    forwards = fwd_map.get(extension, {})
    cfu = forwards.get("unconditional")
    cfb = forwards.get("busy")
    cfna = forwards.get("no_answer")

    lines = []

    # Unconditional forward (CFU) - skip dialing extension entirely
    if cfu:
        lines.append(f' same => n,NoOp(CFU active: forwarding to {cfu.destination})')
        if early_answer:
            lines.append(f' same => n,Answer()')
            lines.append(f' same => n,Wait(0.5)')
        lines.append(f' same => n,Goto(internal,{cfu.destination},1)')
        lines.append(f' same => n,Hangup()')
        return "\n".join(lines)

    # Early answer for inbound trunk calls to prevent provider BYE race condition
    if early_answer:
        lines.append(f' same => n,Answer()')
        lines.append(f' same => n,Wait(0.5)')

    # Check if device is reachable before dialing - if offline, jump straight to voicemail
    actual_ring = cfna.ring_time if cfna else ring_time
    lines.append(f' same => n,Set(DEVICE_STATE=${{DEVICE_STATE(PJSIP/{extension})}})')
    lines.append(f' same => n,GotoIf($["${{DEVICE_STATE}}" = "UNAVAILABLE"]?unavail)')
    lines.append(f' same => n,GotoIf($["${{DEVICE_STATE}}" = "INVALID"]?unavail)')
    lines.append(f' same => n,Dial(PJSIP/{extension},{actual_ring},tTr)')

    if cfb and cfna:
        lines.append(f' same => n,GotoIf($["${{DIALSTATUS}}" = "BUSY"]?busy:noanswer)')
        lines.append(f' same => n(noanswer),NoOp(CFNA: forwarding to {cfna.destination})')
        lines.append(f' same => n,Goto(internal,{cfna.destination},1)')
        lines.append(f' same => n,VoiceMail({extension}@default,u)')
        lines.append(f' same => n,Hangup()')
        lines.append(f' same => n(busy),NoOp(CFB: forwarding to {cfb.destination})')
        lines.append(f' same => n,Goto(internal,{cfb.destination},1)')
        lines.append(f' same => n,VoiceMail({extension}@default,b)')
        lines.append(f' same => n,Hangup()')
    elif cfb:
        lines.append(f' same => n,GotoIf($["${{DIALSTATUS}}" = "BUSY"]?busy:unavail)')
        lines.append(f' same => n(unavail),VoiceMail({extension}@default,u)')
        lines.append(f' same => n,Hangup()')
        lines.append(f' same => n(busy),NoOp(CFB: forwarding to {cfb.destination})')
        lines.append(f' same => n,Goto(internal,{cfb.destination},1)')
        lines.append(f' same => n,VoiceMail({extension}@default,b)')
        lines.append(f' same => n,Hangup()')
    elif cfna:
        lines.append(f' same => n,GotoIf($["${{DIALSTATUS}}" = "BUSY"]?busy:noanswer)')
        lines.append(f' same => n(noanswer),NoOp(CFNA: forwarding to {cfna.destination})')
        lines.append(f' same => n,Goto(internal,{cfna.destination},1)')
        lines.append(f' same => n,VoiceMail({extension}@default,u)')
        lines.append(f' same => n,Hangup()')
        lines.append(f' same => n(busy),VoiceMail({extension}@default,b)')
        lines.append(f' same => n,Hangup()')
    else:
        # Standard behavior
        lines.append(f' same => n,GotoIf($["${{DIALSTATUS}}" = "BUSY"]?busy:unavail)')
        lines.append(f' same => n(unavail),VoiceMail({extension}@default,u)')
        lines.append(f' same => n,Hangup()')
        lines.append(f' same => n(busy),VoiceMail({extension}@default,b)')
        lines.append(f' same => n,Hangup()')

    return "\n".join(lines)


def _build_outbound_map(
    routes: List[InboundRoute],
    peers: Optional[List[SIPPeer]] = None,
    trunks: Optional[List[SIPTrunk]] = None
) -> dict:
    """Build a mapping of extension -> outbound configuration.
    Decoupled from Inbound Routes: any active extension can dial out via the company default trunk
    even if it does not have a dedicated inbound DID assigned."""
    peer_map = {}
    if peers:
        for p in peers:
            peer_map[p.extension] = p

    routes_by_ext: dict = {}
    for route in routes:
        ext = route.destination_extension
        if ext not in routes_by_ext:
            routes_by_ext[ext] = []
        routes_by_ext[ext].append(route)

    # Detect fallback default trunk
    default_trunk = None
    if trunks:
        for t in trunks:
            if t.enabled:
                default_trunk = t
                break

    outbound: dict = {}
    all_extensions = set(routes_by_ext.keys())
    if peers:
        for p in peers:
            if p.enabled:
                all_extensions.add(p.extension)

    for ext in all_extensions:
        peer = peer_map.get(ext)
        ext_routes = routes_by_ext.get(ext, [])
        if ext_routes:
            selected_route = ext_routes[0]
            if peer and peer.outbound_cid:
                for r in ext_routes:
                    if r.did == peer.outbound_cid:
                        selected_route = r
                        break
            outbound[ext] = {
                "trunk_id": selected_route.trunk_id,
                "did": selected_route.did,
                "pai": peer.pai if peer else None,
            }
        elif default_trunk:
            # Fallback to default trunk for extensions without dedicated DID
            caller_id_val = (peer.caller_id if peer and peer.caller_id else None) or default_trunk.caller_id or default_trunk.username or ext
            outbound[ext] = {
                "trunk_id": default_trunk.id,
                "did": caller_id_val,
                "pai": peer.pai if peer else None,
            }

    return outbound


def _build_ring_timeout_map(mailboxes: List[VoicemailMailbox]) -> dict:
    """Build a dict: extension -> ring_timeout"""
    return {mb.extension: (mb.ring_timeout or 20) for mb in mailboxes}


def _generate_ring_group_logic(group: RingGroup) -> str:
    """Generate dial logic for a ring group queue"""
    queue_name = f"rg_{group.id}"
    ring_time = group.ring_time or 20
    lines = []
    lines.append(f" same => n,Queue({queue_name},tT,,,{ring_time})")
    lines.append(" same => n,Hangup()")
    return "\n".join(lines)


def _generate_ivr_context(menu: IVRMenu) -> str:
    """Generate IVR menu dialplan context"""
    ctx = f"[ivr-{menu.id}]\n"
    ctx += "exten => s,1,NoOp(IVR Menu: " + menu.name + ")\n"
    ctx += ' same => n,Set(IVR_TRIES=${IF($["${IVR_TRIES}"=""]?0:${IVR_TRIES})})\n'
    ctx += f" same => n,Set(IVR_MAX={menu.retries or 0})\n"
    ctx += " same => n,Answer()\n"
    ctx += " same => n,Wait(0.5)\n"
    if menu.prompt:
        ctx += f" same => n,Background({menu.prompt})\n"
    ctx += f" same => n,WaitExten({menu.timeout_seconds or 5})\n"
    for opt in sorted(menu.options, key=lambda o: o.position):
        ctx += f"exten => {opt.digit},1,NoOp(IVR Option {opt.digit} -> {opt.destination})\n"
        ctx += f" same => n,Goto(internal,{opt.destination},1)\n"
    if menu.timeout_destination:
        ctx += "exten => i,1,NoOp(IVR Invalid)\n"
        ctx += " same => n,Set(IVR_TRIES=$[${IVR_TRIES}+1])\n"
        ctx += " same => n,GotoIf($[${IVR_TRIES} <= ${IVR_MAX}]?s,1)\n"
        ctx += f" same => n,Goto(internal,{menu.timeout_destination},1)\n"
        ctx += "exten => t,1,NoOp(IVR Timeout)\n"
        ctx += " same => n,Set(IVR_TRIES=$[${IVR_TRIES}+1])\n"
        ctx += " same => n,GotoIf($[${IVR_TRIES} <= ${IVR_MAX}]?s,1)\n"
        ctx += f" same => n,Goto(internal,{menu.timeout_destination},1)\n"
    else:
        ctx += "exten => i,1,Playback(pbx-invalid)\n"
        ctx += " same => n,Set(IVR_TRIES=$[${IVR_TRIES}+1])\n"
        ctx += " same => n,GotoIf($[${IVR_TRIES} <= ${IVR_MAX}]?s,1)\n"
        ctx += " same => n,Hangup()\n"
        ctx += "exten => t,1,Set(IVR_TRIES=$[${IVR_TRIES}+1])\n"
        ctx += " same => n,GotoIf($[${IVR_TRIES} <= ${IVR_MAX}]?s,1)\n"
        ctx += " same => n,Hangup()\n"
    ctx += "\n"
    return ctx


def generate_extensions_config(
    routes: List[InboundRoute],
    forwards: Optional[List[CallForward]] = None,
    mailboxes: Optional[List[VoicemailMailbox]] = None,
    peers: Optional[List[SIPPeer]] = None,
    trunks: Optional[List[SIPTrunk]] = None,
    ring_groups: Optional[List[RingGroup]] = None,
    ivr_menus: Optional[List[IVRMenu]] = None
) -> str:
    """Generate complete extensions.conf supporting Thailand and international telephony standards"""

    fwd_map = _build_forward_map(forwards or [])
    outbound_map = _build_outbound_map(routes, peers, trunks)

    trunk_map = {}
    if trunks:
        for t in trunks:
            trunk_map[t.id] = t
    ring_timeout_map = _build_ring_timeout_map(mailboxes or [])

    config = """; Auto-generated dialplan configuration
; Generated by VoiceLinkPBX (Thailand & International Edition)

[general]
static=yes
writeprotect=no
clearglobalvars=no

[globals]

[internal]
; === Internal Extension Dialing ===
"""
    # Ring groups
    ring_group_map = {}
    if ring_groups:
        for g in ring_groups:
            ring_group_map[g.extension] = g
            if not g.enabled:
                continue
            config += f"exten => {g.extension},1,NoOp(Ring Group {g.name})\n"
            config += f" same => n,Set(CALLERID(name)=${{CALLERID(name)}})\n"
            config += _generate_ring_group_logic(g)
            config += "\n\n"

    # IVR menus
    ivr_map = {}
    if ivr_menus:
        for m in ivr_menus:
            ivr_map[m.extension] = m
            if not m.enabled:
                continue
            config += f"exten => {m.extension},1,NoOp(IVR {m.name})\n"
            config += f" same => n,Goto(ivr-{m.id},s,1)\n\n"

    # BLF hints for peers
    if peers:
        config += "; Busy Lamp Field (BLF) Hints\n"
        for p in peers:
            try:
                if p.enabled and getattr(p, "blf_enabled", True):
                    config += f"exten => {p.extension},hint,PJSIP/{p.extension}\n"
            except Exception:
                continue
        config += "\n"

    # Match internal 3-digit and 4-digit extension ranges
    config += "; Match 3-digit extensions (100-899)\n"
    config += "exten => _[1-8]XX,1,NoOp(Internal Call to ${EXTEN})\n"
    config += " same => n,Set(CALLERID(name)=${CALLERID(name)})\n"
    config += _generate_dial_logic("${EXTEN}", {}, 20)
    config += "\n\n"

    config += "; Match 4-digit extensions (1000-8999)\n"
    config += "exten => _[1-8]XXX,1,NoOp(Internal Call to ${EXTEN})\n"
    config += " same => n,Set(CALLERID(name)=${CALLERID(name)})\n"
    config += _generate_dial_logic("${EXTEN}", {}, 20)
    config += "\n\n"

    # Collect extensions that need per-extension custom rules (call forward or custom timeout)
    override_extensions = set(fwd_map.keys())
    for ext, timeout in ring_timeout_map.items():
        if timeout != 20:
            override_extensions.add(ext)

    for ext in sorted(override_extensions):
        ext_ring = ring_timeout_map.get(ext, 20)
        config += f"; Extension {ext} - Custom Forwarding/Timeout\n"
        config += f"exten => {ext},1,NoOp(Call to {ext} with custom routing)\n"
        config += f" same => n,Set(CALLERID(name)=${{CALLERID(name)}})\n"
        config += _generate_dial_logic(ext, fwd_map, ext_ring)
        config += "\n\n"

    # === Outbound Calling Triggers ===
    if outbound_map:
        config += "; === Outbound Calling Rules ===\n"
        # Match Thailand national numbers (02 Bangkok, 03-07 Provincial, 06/08/09 Mobile, 00 International)
        config += "exten => _0X.,1,Goto(outbound-routing,${EXTEN},1)\n"
        # Match E.164 International with +
        config += "exten => _+X.,1,Goto(outbound-routing,${EXTEN},1)\n"
        # Match Thailand Emergency & Short Codes (191, 1669, 199, 1155, 1133)
        for short_code in ["191", "1669", "199", "1155", "1133"]:
            config += f"exten => {short_code},1,Goto(outbound-routing,${{EXTEN}},1)\n"
        config += "\n"

    # Feature Codes
    config += """; Feature Codes
; Voicemail main access - dial *98
exten => *98,1,NoOp(Voicemail Access for ${CALLERID(num)})
 same => n,Answer()
 same => n,Wait(0.5)
 same => n,VoiceMailMain(${CALLERID(num)}@default)
 same => n,Hangup()

; Direct Voicemail access - dial *97 + extension
exten => _*97XXX,1,NoOp(Direct Voicemail for ${EXTEN:3})
 same => n,Answer()
 same => n,Wait(0.5)
 same => n,VoiceMail(${EXTEN:3}@default)
 same => n,Hangup()

exten => _*97XXXX,1,NoOp(Direct Voicemail for ${EXTEN:3})
 same => n,Answer()
 same => n,Wait(0.5)
 same => n,VoiceMail(${EXTEN:3}@default)
 same => n,Hangup()

; Call Pickup (*8)
exten => *8,1,NoOp(Call Pickup)
 same => n,Pickup()
 same => n,Hangup()

; Echo test (*43)
exten => *43,1,Answer()
 same => n,Echo()
 same => n,Hangup()

"""

    # Outbound Routing Context
    if outbound_map:
        config += "[outbound-routing]\n"
        config += "exten => _.,1,NoOp(Outbound call from ${CHANNEL(endpoint)} to ${EXTEN})\n"
        for ext in outbound_map:
            config += f' same => n,GotoIf($["${{CHANNEL(endpoint)}}x" = "{ext}x"]?out-{ext})\n'
        config += " same => n,NoOp(No outbound route configured for ${CHANNEL(endpoint)})\n"
        config += " same => n,Playback(ss-noservice)\n"
        config += " same => n,Hangup()\n\n"

        for ext, info in outbound_map.items():
            tid = info["trunk_id"]
            did = info["did"]
            pai = info["pai"]
            trunk = trunk_map.get(tid)
            config += f"; Outbound path for extension {ext}\n"
            config += f"exten => _.,n(out-{ext}),NoOp(Outbound via trunk-ep-{tid} with CallerID {did})\n"
            config += f" same => n,Set(CALLERID(num)={did})\n"
            if pai:
                pai_domain = trunk.sip_server if trunk else "localhost"
                config += f" same => n,Set(PJSIP_HEADER(add,P-Asserted-Identity)=<sip:{pai}@{pai_domain}>)\n"
            config += f" same => n,Dial(PJSIP/${{EXTEN}}@trunk-ep-{tid},120,tT)\n"
            config += " same => n,Hangup()\n\n"

    # Inbound DID Routing
    config += """[from-trunk]
; Inbound DID routing
; Fallback for providers that send DID in To header instead of Request-URI
exten => s,1,NoOp(Inbound call with no DID in Request-URI)
 same => n,Set(TO_HDR=${PJSIP_HEADER(read,To)})
 same => n,Set(DID=${CUT(CUT(TO_HDR,@,1),:,2)})
 same => n,NoOp(Extracted DID: ${DID})
 same => n,GotoIf($[${LEN(${DID})} > 0]?from-trunk,${DID},1)
 same => n,NoOp(Could not extract DID from To header)
 same => n,Hangup()

"""

    if routes:
        for route in routes:
            desc = route.description or route.did
            ext = route.destination_extension
            config += f"\n; {desc}\n"
            config += f"exten => {route.did},1,NoOp(Inbound call to DID {route.did})\n"
            config += f" same => n,Set(CALLERID(name)=${{CALLERID(name)}})\n"
            rg = ring_group_map.get(ext)
            ivr = ivr_map.get(ext)
            if ivr and ivr.enabled:
                config += " same => n,Answer()\n"
                config += " same => n,Wait(0.5)\n"
                config += f" same => n,Goto(ivr-{ivr.id},s,1)\n"
            elif rg and rg.enabled:
                config += " same => n,Answer()\n"
                config += " same => n,Wait(0.5)\n"
                config += _generate_ring_group_logic(rg)
            else:
                ext_ring = ring_timeout_map.get(ext, 20)
                config += _generate_dial_logic(ext, fwd_map, ext_ring, early_answer=True)
            config += "\n"
    else:
        config += """
; No inbound routes configured
exten => _X.,1,NoOp(Unrouted inbound call to ${EXTEN})
 same => n,Hangup()
"""

    config += """
; Catch-all for unmatched inbound calls
exten => _[+0-9].,1,NoOp(Unmatched inbound DID ${EXTEN})
 same => n,Hangup()
"""

    # IVR contexts
    if ivr_menus:
        for m in ivr_menus:
            if m.enabled:
                config += "\n" + _generate_ivr_context(m)

    return config


def write_extensions_config(
    routes: List[InboundRoute],
    forwards: Optional[List[CallForward]] = None,
    mailboxes: Optional[List[VoicemailMailbox]] = None,
    peers: Optional[List[SIPPeer]] = None,
    trunks: Optional[List[SIPTrunk]] = None,
    ring_groups: Optional[List[RingGroup]] = None,
    ivr_menus: Optional[List[IVRMenu]] = None
) -> bool:
    """Write extensions.conf to Asterisk volume"""
    try:
        config_content = generate_extensions_config(routes, forwards, mailboxes, peers, trunks, ring_groups, ivr_menus)
        os.makedirs(os.path.dirname(EXTENSIONS_CONFIG_PATH), exist_ok=True)
        with open(EXTENSIONS_CONFIG_PATH, "w") as f:
            f.write(config_content)
        logger.info(f"extensions.conf written with {len(routes)} inbound routes")
        return True
    except Exception as e:
        logger.error(f"Failed to write extensions.conf: {e}")
        return False


def reload_dialplan() -> bool:
    """Reload Asterisk dialplan"""
    try:
        result = subprocess.run(
            ['docker', 'exec', 'pbx_asterisk', 'sh', '-c',
             'cp /etc/asterisk/custom/extensions.conf /etc/asterisk/extensions.conf && asterisk -rx "dialplan reload"'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            logger.info("Asterisk dialplan reloaded successfully")
            return True
        else:
            logger.error(f"Dialplan reload failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Failed to reload dialplan: {e}")
        return False
