--[[
  Usage: lua blueprints2json.lua <manifest> [projectiles]

  With "projectiles" as the second argument it keeps every blueprint and emits
  only its Categories, which is how a weapon's projectile is identified as a
  torpedo (Categories contains "TORPEDO") rather than a depth charge.

  Reads a manifest of Supreme Commander blueprint paths (one "ID<TAB>path" per
  line), evaluates each as Lua, and writes JSON to stdout.

  FA blueprints are Lua source that calls UnitBlueprint{...}. Defining the
  constructors as identity functions and evaluating the file is far more robust
  than parsing it, and it is how FAForever/spooky-db's own tooling works.

  Each blueprint is loaded into its own sandboxed environment so a stray global
  in one blueprint cannot affect another, or us.
]]

local function identity(t) return t end

-- Constructors a unit blueprint may call.
local CONSTRUCTORS = {
  'UnitBlueprint', 'Sound', 'MeshBlueprint', 'ProjectileBlueprint',
  'PropBlueprint', 'EmitterBlueprint', 'BeamBlueprint', 'TrailEmitterBlueprint',
}

local KEEP = {
  'Description', 'Categories', 'StrategicIconName', 'General', 'Defense', 'Economy',
  'Intel', 'Physics', 'Air', 'Display', 'Transport', 'Wreckage', 'Weapon',
  'VeteranMassMult', 'VeteranMass', 'Enhancements', 'Buffs',
}

local FACTIONS = { UEF = true, AEON = true, CYBRAN = true, SERAPHIM = true, NOMADS = true }

local function esc(s)
  s = s:gsub('\\', '\\\\'):gsub('"', '\\"')
  s = s:gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t')
  return (s:gsub('[%z\1-\31]', function(c) return string.format('\\u%04x', c:byte()) end))
end

-- Blueprint strings carry "<LOC key>Actual text" localisation prefixes.
local function stripLoc(s) return s:match('^<LOC[^>]*>(.*)$') or s end

local function isArray(t)
  local n = 0
  for k in pairs(t) do
    if type(k) ~= 'number' then return false, 0 end
    if k > n then n = k end
  end
  return true, n
end

local encode
encode = function(v)
  local tv = type(v)
  if v == nil then return 'null' end
  if tv == 'boolean' then return tostring(v) end
  if tv == 'number' then
    if v ~= v or v == math.huge or v == -math.huge then return 'null' end
    if math.type(v) == 'integer' then return string.format('%d', v) end
    return string.format('%.17g', v)
  end
  if tv == 'string' then return '"' .. esc(stripLoc(v)) .. '"' end
  if tv ~= 'table' then return 'null' end

  local arr, n = isArray(v)
  local out = {}
  if arr then
    for i = 1, n do out[#out + 1] = encode(v[i]) end
    return '[' .. table.concat(out, ',') .. ']'
  end
  local keys = {}
  for k in pairs(v) do if type(k) == 'string' then keys[#keys + 1] = k end end
  table.sort(keys)
  for _, k in ipairs(keys) do out[#out + 1] = '"' .. esc(k) .. '":' .. encode(v[k]) end
  return '{' .. table.concat(out, ',') .. '}'
end

local function readFile(path)
  local f = io.open(path, 'rb')
  if not f then return nil end
  local content = f:read('a')
  f:close()
  return content
end

--- Real, buildable units only: selectable and belonging to a faction. Drops
--- props, effects, campaign and test blueprints.
local function keep(bp)
  if type(bp) ~= 'table' or type(bp.Categories) ~= 'table' then return false end
  local set = {}
  for _, c in ipairs(bp.Categories) do
    if type(c) == 'string' then set[c] = true end
  end
  if not set.SELECTABLE then return false end
  if set.CIVILIAN or set.OPERATION then return false end
  -- Test harness blueprints ship in the units directory alongside real ones.
  -- Descriptions still carry their "<LOC key>" prefix here, so strip first.
  if type(bp.Description) == 'string' and stripLoc(bp.Description):match('^Test') then return false end
  for f in pairs(FACTIONS) do if set[f] then return true end end
  return false
end

local results, errors, kept = {}, {}, 0

local manifest = arg[1]
local projectileMode = arg[2] == 'projectiles'
if not manifest then
  io.stderr:write('usage: lua blueprints2json.lua <manifest> [projectiles]\n')
  os.exit(1)
end

for line in io.lines(manifest) do
  local id, path = line:match('^(%S+)\t(.+)$')
  if id then
    local src = readFile(path)
    if not src then
      errors[#errors + 1] = id .. ': unreadable'
    else
      -- Older blueprints use '#' for comments; modern FAF uses '--'. Only swap
      -- when the file has no '--' comments at all, so we never touch a '#'
      -- inside a string in a modern blueprint.
      if not src:find('%-%-') and src:find('#') then src = src:gsub('#', '--') end

      local env = {}
      for _, name in ipairs(CONSTRUCTORS) do env[name] = identity end
      setmetatable(env, { __index = _G })

      local chunk, err = load('return ' .. src, id, 't', env)
      if not chunk then
        errors[#errors + 1] = id .. ': ' .. tostring(err)
      else
        local ok, bp = pcall(chunk)
        if not ok then
          errors[#errors + 1] = id .. ': ' .. tostring(bp)
        elseif projectileMode then
          if type(bp) == 'table' then
            kept = kept + 1
            -- Fragments and FragmentId as well as Categories. A fragmentation
            -- shell splits on impact and the game multiplies the weapon's
            -- damage by the count, walking the chain to the last link
            -- (unitviewDetail.lua:613-617). Without these two fields that
            -- multiplication cannot happen and every fragmenting weapon reads
            -- at a fraction of its damage.
            local phys = type(bp.Physics) == 'table' and bp.Physics or {}
            results[#results + 1] = encode({
              Id = id,
              Categories = bp.Categories,
              Fragments = phys.Fragments,
              FragmentId = phys.FragmentId,
            })
          end
        elseif keep(bp) then
          local out = { Id = id }
          for _, k in ipairs(KEEP) do
            if bp[k] ~= nil then out[k] = bp[k] end
          end
          kept = kept + 1
          results[#results + 1] = encode(out)
        end
      end
    end
  end
end

io.write('{"units":[', table.concat(results, ','), '],"errors":[')
local encErr = {}
for _, e in ipairs(errors) do encErr[#encErr + 1] = '"' .. esc(e) .. '"' end
io.write(table.concat(encErr, ','), ']}')
