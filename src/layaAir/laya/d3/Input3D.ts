import { MouseTouch } from "././MouseTouch";
import { Touch } from "././Touch";
import { Laya } from "Laya";
import { Script3D } from "./component/Script3D"
	import { SimpleSingletonList } from "./component/SimpleSingletonList"
	import { BaseCamera } from "./core/BaseCamera"
	import { Camera } from "./core/Camera"
	import { Sprite3D } from "./core/Sprite3D"
	import { Scene3D } from "./core/scene/Scene3D"
	import { Ray } from "./math/Ray"
	import { Vector2 } from "./math/Vector2"
	import { Vector3 } from "./math/Vector3"
	import { Viewport } from "./math/Viewport"
	import { HitResult } from "./physics/HitResult"
	import { Point } from "laya/maths/Point"
	import { Browser } from "laya/utils/Browser"
	import { Stat } from "laya/utils/Stat"
	
	/**
	 * <code>Input3D</code> 类用于实现3D输入。
	 */
	export class Input3D {
		/**@private */
		private static _tempPoint:Point = new Point();
		/**@private */
		private static _tempVector20:Vector2 = new Vector2();
		/**@private */
		private static _tempRay0:Ray = new Ray(new Vector3(), new Vector3());
		/**@private */
		private static _tempHitResult0:HitResult = new HitResult();
		
		/**@private */
		private _scene:Scene3D;
		/**@private */
		private _eventList:any[] = [];
		/**@private */
		private _mouseTouch:MouseTouch = new MouseTouch();
		/**@private */
		private _touchPool:Touch[] = [];
		/**@private */
		private _touches:SimpleSingletonList = new SimpleSingletonList();
		/**@private */
		private _multiTouchEnabled:boolean = true;
		
		/**
		 *@private
		 */
		 __init__(canvas:any, scene:Scene3D):void {
			this._scene = scene;
			var list:any[] = this._eventList;
			canvas.oncontextmenu = function(e:any):any {
				return false;
			}
			canvas.addEventListener('mousedown', function(e:any):void {
				e.preventDefault();
				list.push(e);
			});
			canvas.addEventListener('mouseup', function(e:any):void {
				e.preventDefault();
				list.push(e);
			}, true);
			canvas.addEventListener('mousemove', function(e:any):void {
				e.preventDefault();
				list.push(e);
			}, true);
			
			canvas.addEventListener("touchstart", function(e:any):void {
				e.preventDefault();
				list.push(e);
			});
			canvas.addEventListener("touchend", function(e:any):void {
				e.preventDefault();
				list.push(e);
			}, true);
			canvas.addEventListener("touchmove", function(e:any):void {
				e.preventDefault();
				list.push(e);
			}, true);
			canvas.addEventListener("touchcancel", function(e:any):void {
				//e.preventDefault()会导致debugger中断后touchcancel无法执行,抛异常
				list.push(e);
			}, true);
		}
		
		/**
		 * 获取触摸点个数。
		 * @return 触摸点个数。
		 */
		 touchCount():number {
			return this._touches.length;
		}
		
		/**
		 * 获取是否可以使用多点触摸。
		 * @return 是否可以使用多点触摸。
		 */
		 get multiTouchEnabled():boolean {
			return this._multiTouchEnabled;
		}
		
		/**
		 * 设置是否可以使用多点触摸。
		 * @param 是否可以使用多点触摸。
		 */
		 set multiTouchEnabled(value:boolean) {
			this._multiTouchEnabled = value;
		}
		
		/**
		 * @private
		 * 创建一个 <code>Input3D</code> 实例。
		 */
		constructor(){
		}
		
		/**
		 * @private
		 */
		private _getTouch(touchID:number):Touch {
			var touch:Touch = this._touchPool[touchID];
			if (!touch) {
				touch = new Touch();
				this._touchPool[touchID] = touch;
				touch._identifier = touchID;
			}
			return touch;
		}
		
		/**
		 * @private
		 */
		private _mouseTouchDown():void {
			var touch:MouseTouch = this._mouseTouch;
			var sprite:Sprite3D = touch.sprite;
			touch._pressedSprite = sprite;
			touch._pressedLoopCount = Stat.loopCount;
			if (sprite) {
				var scripts:Script3D[] = sprite._scripts;
				if (scripts) {
					for (var i:number = 0, n:number = scripts.length; i < n; i++)
						scripts[i].onMouseDown();//onMouseDown
				}
			}
		}
		
		/**
		 * @private
		 */
		private _mouseTouchUp():void {
			var i:number, n:number;
			var touch:MouseTouch = this._mouseTouch;
			var lastPressedSprite:Sprite3D = touch._pressedSprite;
			touch._pressedSprite = null;//表示鼠标弹起
			touch._pressedLoopCount = -1;
			var sprite:Sprite3D = touch.sprite;
			if (sprite) {
				if (sprite === lastPressedSprite) {
					var scripts:Script3D[] = sprite._scripts;
					if (scripts) {
						for (i = 0, n = scripts.length; i < n; i++)
							scripts[i].onMouseClick();//onMouseClifck
					}
				}
			}
			
			if (lastPressedSprite) {
				var lastScripts:Script3D[] = lastPressedSprite._scripts;
				if (lastScripts) {
					for (i = 0, n = lastScripts.length; i < n; i++)
						lastScripts[i].onMouseUp();//onMouseUp
				}
			}
		}
		
		/**
		 * @private
		 */
		private _mouseTouchRayCast(cameras:BaseCamera[]):void {
			var touchHitResult:HitResult = Input3D._tempHitResult0;
			var touchPos:Vector2 = Input3D._tempVector20;
			var touchRay:Ray = Input3D._tempRay0;
			
			touchHitResult.succeeded = false;
			var x:number = this._mouseTouch.mousePositionX;
			var y:number = this._mouseTouch.mousePositionY;
			touchPos.x = x;
			touchPos.y = y;
			for (var i:number = cameras.length - 1; i >= 0; i--) {
				var camera:Camera = (<Camera>cameras[i] );
				var viewport:Viewport = camera.viewport;
				if (touchPos.x >= viewport.x && touchPos.y >= viewport.y && touchPos.x <= viewport.width && touchPos.y <= viewport.height) {
					camera.viewportPointToRay(touchPos, touchRay);
					
					var sucess:boolean = this._scene._physicsSimulation.rayCast(touchRay, touchHitResult);
					if (sucess || (camera.clearFlag === BaseCamera.CLEARFLAG_SOLIDCOLOR || camera.clearFlag === BaseCamera.CLEARFLAG_SKY))
						break;
				}
			}
			
			var touch:MouseTouch = this._mouseTouch;
			var lastSprite:Sprite3D = touch.sprite;
			if (touchHitResult.succeeded) {
				var touchSprite:Sprite3D = (<Sprite3D>touchHitResult.collider.owner );
				touch.sprite = touchSprite;
				var scripts:Script3D[] = touchSprite._scripts;
				if (lastSprite !== touchSprite) {
					if (scripts) {
						for (var j:number = 0, m:number = scripts.length; j < m; j++)
							scripts[j].onMouseEnter();//onMouseEnter
					}
				}
			} else {
				touch.sprite = null;
			}
			
			if (lastSprite && (lastSprite !== touchSprite)) {
				var outScripts:Script3D[] = lastSprite._scripts;
				if (outScripts) {
					for (j = 0, m = outScripts.length; j < m; j++)
						outScripts[j].onMouseOut();//onMouseOut
				}
			}
		}
		
		/**
		 * @private
		 * @param flag 0:add、1:remove、2:change
		 */
		 _changeTouches(changedTouches:any[], flag:number):void {
			var offsetX:number = 0, offsetY:number = 0;
			var lastCount:number = this._touches.length;
			for (var j:number = 0, m:number = changedTouches.length; j < m; j++) {
				var nativeTouch:any = changedTouches[j];
				var identifier:number = nativeTouch.identifier;
				if (!this._multiTouchEnabled && identifier !== 0)
					continue;
				var touch:Touch = this._getTouch(identifier);
				var pos:Vector2 = touch._position;
				var mousePoint:Point = Input3D._tempPoint;
				mousePoint.setTo(nativeTouch.pageX,nativeTouch.pageY);
				Laya.stage._canvasTransform.invertTransformPoint(mousePoint);//考虑画布缩放	
				var posX:number = mousePoint.x;
				var posY:number = mousePoint.y;
				switch (flag) {
				case 0://add 
					this._touches.add(touch);
					offsetX += posX;
					offsetY += posY;
					break;
				case 1://remove 
					this._touches.remove(touch);
					offsetX -= posX;
					offsetY -= posY;
					break;
				case 2://change 
					offsetX = posX - pos.x;
					offsetY = posY - pos.y;
					break;
				}
				pos.x= posX;
				pos.y = posY;
			}
			
			var touchCount:number = this._touches.length;
			if (touchCount === 0) {//无触摸点需要归零
				this._mouseTouch.mousePositionX = 0;
				this._mouseTouch.mousePositionY = 0;
			} else {
				this._mouseTouch.mousePositionX = (this._mouseTouch.mousePositionX * lastCount + offsetX) / touchCount;
				this._mouseTouch.mousePositionY = (this._mouseTouch.mousePositionY * lastCount + offsetY) / touchCount;
			}
		}
		
		/**
		 * @private
		 */
		 _update():void {
			var i:number, n:number, j:number, m:number;
			n = this._eventList.length;
			var cameras:BaseCamera[] = this._scene._cameraPool;
			if (n > 0) {
				for (i = 0; i < n; i++) {
					var e:any = this._eventList[i];
					switch (e.type) {
					case "mousedown": 
						this._mouseTouchDown();
						break;
					case "mouseup": 
						this._mouseTouchUp();
						break;
					case "mousemove":
						var mousePoint:Point = Input3D._tempPoint;
						mousePoint.setTo(e.pageX,e.pageY);
						Laya.stage._canvasTransform.invertTransformPoint(mousePoint);//考虑画布缩放
						this._mouseTouch.mousePositionX =mousePoint.x;
						this._mouseTouch.mousePositionY =mousePoint.y;
						this._mouseTouchRayCast(cameras);
						break;
					case "touchstart": 
						var lastLength:number = this._touches.length;
						this._changeTouches(e.changedTouches, 0);
						this._mouseTouchRayCast(cameras);//触摸点击时touchMove不会触发,需要调用_touchRayCast()函数
						(lastLength === 0) && (this._mouseTouchDown());
						break;
					case "touchend": 
					case "touchcancel": 
						this._changeTouches(e.changedTouches, 1);
						(this._touches.length === 0) && (this._mouseTouchUp());
						break;
					case "touchmove": 
						this._changeTouches(e.changedTouches, 2);
						this._mouseTouchRayCast(cameras);
						break;
					default: 
						throw "Input3D:unkonwn event type.";
					}
				}
				this._eventList.length = 0;
			}
			
			var mouseTouch:MouseTouch = this._mouseTouch;
			var pressedSprite:Sprite3D = mouseTouch._pressedSprite;
			if (pressedSprite && (Stat.loopCount > mouseTouch._pressedLoopCount)) {
				var pressedScripts:Script3D[] = pressedSprite._scripts;
				if (pressedScripts) {
					for (j = 0, m = pressedScripts.length; j < m; j++)
						pressedScripts[j].onMouseDrag();//onMouseDrag
				}
			}
			
			var touchSprite:Sprite3D = mouseTouch.sprite;
			if (touchSprite) {
				var scripts:Script3D[] = touchSprite._scripts;
				if (scripts) {
					for (j = 0, m = scripts.length; j < m; j++)
						scripts[j].onMouseOver();//onMouseOver
				}
			}
		}
		
		/**
		 *	获取触摸点。
		 * 	@param	index 索引。
		 * 	@return 触摸点。
		 */
		 getTouch(index:number):Touch {
			if (index < this._touches.length) {
				return (<Touch>this._touches.elements[index] );
			} else {
				return null;
			}
		}
	
	}


