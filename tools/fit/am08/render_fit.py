import bpy, sys, json, math
from mathutils import Matrix, Vector
a=sys.argv[sys.argv.index('--')+1:]; glb,camsf,outp,TIPX=a[0],a[1],a[2],float(a[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.name not in ('EndCar','Bogie','Bogie.001'): bpy.data.objects.remove(o)
keep=[o for o in bpy.data.objects if o.type=='MESH']
for o in keep:
    if o.name=='EndCar': o.matrix_world=Matrix.Translation((-TIPX,0,0))
    else: bpy.data.objects.remove(o)
COL={"paint_body": (0.80, 0.82, 0.80), "paint_cab": (0.92, 0.70, 0.0), "paint_door": (0.65, 0.03, 0.04),
 "paint_skirt": (0.02, 0.04, 0.16), "paint_grey": (0.30, 0.32, 0.34), "paint_roof": (0.55, 0.57, 0.58),
 "rubber": (0.015, 0.015, 0.016), "glass": (0.01, 0.012, 0.014), "metal_dark": (0.04, 0.04, 0.042),
 "lamp_white": (0.9, 0.9, 0.85), "lamp_red": (0.5, 0.02, 0.02), "display": (0.6, 0.3, 0.02), "interior": (0.10, 0.14, 0.22)}
for m in bpy.data.materials:
    k=m.name.split('.')[0]
    if k in COL: m.diffuse_color=(*COL[k],1)
s=bpy.context.scene; s.render.engine='BLENDER_WORKBENCH'; s.display.shading.light='STUDIO'; s.display.shading.color_type='MATERIAL'
s.render.film_transparent=True; s.view_settings.view_transform='Standard'
for nm,c in json.load(open(camsf)).items():
    cd=bpy.data.cameras.new(nm); cd.sensor_fit='HORIZONTAL'; cd.sensor_width=36; cd.lens=c['f']*36/c['W']; cd.clip_start=0.1
    co=bpy.data.objects.new(nm,cd); s.collection.objects.link(co)
    R=Matrix(c['R']); M=R.transposed()@Matrix(((1,0,0),(0,-1,0),(0,0,-1)))
    co.matrix_world=Matrix.Translation(Vector(c['C']))@M.to_4x4()
    s.camera=co; s.render.resolution_x=c['W']; s.render.resolution_y=c['H']; s.render.resolution_percentage=100
    s.render.filepath=f"{outp}_{nm}.png"; bpy.ops.render.render(write_still=True)
